import { Injectable, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityAnswer } from './security-answer.entity';
import { User } from '../user/user.entity';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

/**
 * SecurityResetService
 *
 * Flow:
 *  - initiate(identifier) -> returns question keys if account exists (no sensitive data)
 *  - verify(identifier, answers[], recoveryPassphrase) -> validates answers + recoveryPassphrase, returns short-lived reset token (JWT)
 *  - confirm(token, newPassword) -> validates token, updates password
 *
 * Notes:
 * - All stored answers and recovery passphrase are HMAC-SHA256 hashed using SECURITY_SECRET.
 * - Reset token is a signed JWT (purpose: 'security-reset') signed with JWT_SECRET and short TTL.
 */
@Injectable()
export class SecurityResetService {
  constructor(
    @InjectRepository(SecurityAnswer)
    private readonly answerRepo: Repository<SecurityAnswer>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private getRequestLimitPerHour() {
    return Number(this.config.get('RESET_REQUEST_LIMIT_PER_HOUR') || 5);
  }
  private getMaxAttempts() {
    return Number(this.config.get('RESET_MAX_ATTEMPTS') || 5);
  }
  private getResetTokenTtlMs() {
    return Number(this.config.get('RESET_TOKEN_TTL_MS') || 15 * 60 * 1000);
  }

  private securitySecret(): string {
    const s = this.config.get<string>('SECURITY_SECRET');
    if (!s) throw new InternalServerErrorException('SECURITY_SECRET is not configured');
    return s;
  }

  private hashValue(value: string) {
    // normalize by trimming only; preserve case/punctuation to maximize entropy (document this in UI)
    return crypto.createHmac('sha256', this.securitySecret()).update((value || '').trim()).digest('hex');
  }

  /**
   * initiate(identifier)
   * - identifier: email or user UID (user_uid)
   * - returns { found, hasQuestions, questions: [questionKey], display? }
   */
  public async initiate(identifier: string) {
    if (!identifier) throw new BadRequestException('Identifier required');

    const ident = identifier.trim();
    const user = await this.userRepo.findOne({
      where: [
        { email: ident.toLowerCase() },
        // @ts-ignore: optional user_uid support
        { user_uid: ident },
      ] as any,
    });

    const generic = { found: false, message: 'If an account with that identifier exists, follow the next steps.' };

    if (!user) {
      // Avoid account enumeration: return generic found:false
      return generic;
    }

    const answers = await this.answerRepo.find({ where: { userId: user.id } });
    if (!answers || answers.length === 0) {
      return { found: true, hasQuestions: false, message: 'Account exists but no security questions configured. Contact support.' };
    }

    const questionKeys = answers.map(a => a.questionKey);
    // pick two distinct random questions
    const shuffled = questionKeys.sort(() => 0.5 - Math.random());
    const pick = shuffled.slice(0, Math.min(2, shuffled.length));

    return {
      found: true,
      hasQuestions: true,
      questions: pick,
      display: user.name ? user.name : `Account ${user.id}`,
    };
  }

  /**
   * verify(identifier, answers[], recoveryPassphrase)
   * - answers: [{ questionKey, answer }]
   * - recoveryPassphrase: string (masked)
   *
   * On success returns { token, expiresAt, message }
   */
  public async verify(identifier: string, answers: Array<{ questionKey: string; answer: string }>, recoveryPassphrase?: string) {
    if (!identifier) throw new BadRequestException('Identifier required');
    if (!answers || !Array.isArray(answers) || answers.length === 0) throw new BadRequestException('Answers required');

    const ident = identifier.trim();
    const user = await this.userRepo.findOne({
      where: [
        { email: ident.toLowerCase() },
        // @ts-ignore
        { user_uid: ident },
      ] as any,
    });
    if (!user) throw new BadRequestException('Invalid credentials');

    const stored = await this.answerRepo.find({ where: { userId: user.id } });
    if (!stored || stored.length === 0) throw new BadRequestException('No security data configured');

    // Verify answers
    let mismatches = 0;
    for (const a of answers) {
      const s = stored.find(x => x.questionKey === a.questionKey);
      if (!s) {
        mismatches += 1;
        continue;
      }
      const providedHash = this.hashValue(a.answer || '');
      if (providedHash !== s.answerHash) mismatches += 1;
    }

    // Verify recoveryPassphrase if stored on user
    if (user['recoveryPassphraseHash']) {
      const rpHash = this.hashValue(recoveryPassphrase || '');
      if (rpHash !== user['recoveryPassphraseHash']) mismatches += 1;
    }

    if (mismatches >= this.getMaxAttempts()) {
      throw new ForbiddenException('Verification failed. Too many incorrect answers.');
    }
    if (mismatches > 0) {
      throw new BadRequestException('One or more answers are incorrect.');
    }

    // Success -> issue short-lived JWT token scoped to security-reset
    const payload = { sub: user.id, purpose: 'security-reset' };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: `${Math.round(this.getResetTokenTtlMs() / 1000)}s`,
    });

    return { token, expiresAt: Date.now() + this.getResetTokenTtlMs(), message: 'Verification successful' };
  }

  /**
   * confirm(token, newPassword)
   * - validate JWT token and update user's password
   */
  public async confirm(token: string, newPassword: string) {
    if (!token) throw new BadRequestException('Reset token required');
    if (!newPassword || newPassword.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, { secret: this.config.get<string>('JWT_SECRET') });
    } catch (e) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!payload || payload.purpose !== 'security-reset' || !payload.sub) throw new BadRequestException('Invalid reset token');

    const userId = Number(payload.sub);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Invalid token');

    const bcrypt = await import('bcrypt');
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    // Optionally invalidate sessions here (tokenVersion etc.)

    return { message: 'Password updated' };
  }
}