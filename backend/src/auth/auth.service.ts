import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { SecurityAnswer } from '../security-reset/security-answer.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SecurityAnswer)
    private readonly answerRepo: Repository<SecurityAnswer>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Validate user credentials.
   * Returns the user entity when valid, otherwise null.
   */
  public async validateUser(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return null;
    const matches = await bcrypt.compare(password, user.password);
    if (!matches) return null;
    return user;
  }

  /**
   * Login: validate credentials and return JWT + user payload.
   */
  public async login({ email, password }: { email: string; password: string }) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      level: user.level,
      plan_expiry: user.plan_expiry,
      user_uid: user.user_uid,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
      }),
      user: payload,
    };
  }

  /**
   * Register a new user:
   * - creates unique user_uid
   * - stores phone, plan
   * - hashes recoveryPassphrase with SECURITY_SECRET and saves it to user.recoveryPassphraseHash
   * - saves security answers in user_security_answer as HMAC hashed values
   * - returns login payload (access_token + user)
   */
  public async register(payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    plan?: string;
    recoveryPassphrase: string;
    securityAnswers: Array<{ questionKey: string; answer: string }>;
  }) {
    const email = (payload.email || '').toLowerCase().trim();
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    // hash password
    const hash = await bcrypt.hash(payload.password, 10);

    // generate a short unique user id (user_uid)
    let userUid: string;
    for (;;) {
      userUid = 'u' + crypto.randomBytes(6).toString('hex'); // ~12 hex chars
      const existing = await this.userRepo.findOne({ where: { user_uid: userUid } });
      if (!existing) break;
    }

    // Hash recovery passphrase using SECURITY_SECRET (HMAC-SHA256)
    const securitySecret = this.configService.get<string>('SECURITY_SECRET');
    if (!securitySecret) throw new InternalServerErrorException('SECURITY_SECRET not configured');

    const recoveryHash = crypto.createHmac('sha256', securitySecret).update((payload.recoveryPassphrase || '').trim()).digest('hex');

    // create user entity
    const user = this.userRepo.create({
      email,
      password: hash,
      name: payload.name,
      phone: payload.phone || null,
      plan: payload.plan || 'Free',
      user_uid: userUid,
      recoveryPassphraseHash: recoveryHash,
    });

    await this.userRepo.save(user);

    // store security answers (HMAC hashed)
    const answers = payload.securityAnswers || [];
    const savedAnswers = [];
    for (const a of answers) {
      if (!a.questionKey || !a.answer) continue;
      const answerHash = crypto.createHmac('sha256', securitySecret).update((a.answer || '').trim()).digest('hex');
      const sa = this.answerRepo.create({
        userId: user.id,
        questionKey: a.questionKey,
        answerHash,
      } as any);
      savedAnswers.push(await this.answerRepo.save(sa));
    }

    // Return login payload by calling login (will validate password)
    return this.login({ email, password: payload.password });
  }

  /**
   * Change password for authenticated user.
   */
  public async changePassword(id: number, oldPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
    return { message: 'Password changed' };
  }

  /**
   * Change email for authenticated user (protected endpoint)
   */
  public async changeEmail(id: number, newEmail: string) {
    if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) throw new BadRequestException('Invalid email');

    const existing = await this.userRepo.findOne({ where: { email: newEmail.toLowerCase().trim() } });
    if (existing && existing.id !== id) throw new ConflictException('Email already in use');

    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new BadRequestException('User not found');

    user.email = newEmail.toLowerCase().trim();
    await this.userRepo.save(user);

    return { message: 'Email updated', email: user.email };
  }

  /**
   * Find user by id.
   */
  public async findById(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }

  /**
   * When using Google OAuth, ensure user exists and return JWT payload.
   */
  public async validateGoogleUser(googleProfile: any) {
    let user = await this.userRepo.findOne({ where: { email: googleProfile.email } });
    if (!user) {
      user = this.userRepo.create({
        email: googleProfile.email,
        name: googleProfile.name,
        googleId: googleProfile.googleId,
        password: '', // Not used for Google accounts
      });
      await this.userRepo.save(user);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      level: user.level,
      plan_expiry: user.plan_expiry,
      user_uid: user.user_uid,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
      }),
      user: payload,
    };
  }

  // --------------------------
  // Password reset helpers (unchanged)
  // --------------------------
  // (keep existing requestPasswordReset and confirmPasswordReset methods if present)
}