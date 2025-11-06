import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Admin } from './admin.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { User } from '../user/user.entity';
import { SecurityAnswer } from '../security-reset/security-answer.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SecurityAnswer)
    private readonly answerRepo: Repository<SecurityAnswer>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Admin login (returns access_token)
  async login({ email, password }: { email: string; password: string }) {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    const token = this.jwtService.sign(payload);
    return {
      access_token: token,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    };
  }

  // Statistics for dashboard
  async getStats() {
    const totalUsers = await this.userRepo.count();
    const activeUsers = await this.userRepo.count({ where: { active: true } });
    // Plans summary
    const plans = await this.userRepo
      .createQueryBuilder('u')
      .select('u.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.plan')
      .getRawMany();
    const plansSummary = plans.reduce((acc, p) => {
      acc[p.plan] = Number(p.count);
      return acc;
    }, {} as Record<string, number>);

    // Recent signups (last 6)
    const recent = await this.userRepo.find({
      take: 6,
      order: { id: 'DESC' },
      select: ['id', 'user_uid', 'name', 'email', 'plan'],
    });

    return {
      totalUsers,
      activeUsers,
      plansSummary,
      recentSignups: recent,
    };
  }

  // Paginated users listing with simple search
  async listUsers(q?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const qb = this.userRepo.createQueryBuilder('u');

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      qb.where('u.name ILIKE :term OR u.email ILIKE :term OR u.user_uid ILIKE :term', { term });
    }

    qb.orderBy('u.id', 'DESC').take(limit).skip(skip);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // Get user details (do not return secrets)
  async getUser(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // fetch configured question keys for display (no answers)
    const answers = await this.answerRepo.find({ where: { userId: user.id } });
    const questionKeys = answers.map(a => a.questionKey);

    const safeUser = {
      id: user.id,
      user_uid: (user as any).user_uid,
      name: user.name,
      email: user.email,
      phone: (user as any).phone,
      plan: user.plan,
      plan_expiry: user.plan_expiry || null,
      active: (user as any).active,
      createdAt: (user as any).createdAt || null,
      securityQuestions: questionKeys,
    };
    return safeUser;
  }

  // Update user (select fields)
  async updateUser(id: number, payload: Partial<User>) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Only allow specific fields to be updated by admin
    const allowed: (keyof User)[] = ['name', 'email', 'plan', 'level'];
    for (const key of allowed) {
      if (payload[key] !== undefined) {
        (user as any)[key] = payload[key];
      }
    }
    // allow phone & active even though not on original allowed list
    if ((payload as any).phone !== undefined) (user as any).phone = (payload as any).phone;
    if ((payload as any).active !== undefined) (user as any).active = (payload as any).active;

    await this.userRepo.save(user);
    return { message: 'User updated', user };
  }

  // Admin resets password: if newPassword provided, set it; otherwise generate a temp password and set it.
  async resetPassword(id: number, newPassword?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const passwordToSet = newPassword && newPassword.length >= 8 ? newPassword : this.generateTempPassword();
    const hashed = await bcrypt.hash(passwordToSet, 10);
    user.password = hashed;
    await this.userRepo.save(user);

    // Return temp password only to admin (do not log to public logs)
    return { message: 'Password reset', tempPassword: passwordToSet };
  }

  // Replace or clear security answers + optionally set a new recovery passphrase
  async resetSecurity(id: number, payload: { recoveryPassphrase?: string; securityAnswers?: Array<{ questionKey: string; answer: string }> }) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const securitySecret = this.configService.get<string>('SECURITY_SECRET');
    if (!securitySecret) throw new InternalServerErrorException('SECURITY_SECRET not configured');

    // Update recovery passphrase if provided
    if (payload.recoveryPassphrase !== undefined) {
      const rpHash = crypto.createHmac('sha256', securitySecret).update((payload.recoveryPassphrase || '').trim()).digest('hex');
      (user as any).recoveryPassphraseHash = rpHash;
      await this.userRepo.save(user);
    }

    // Replace security answers if provided
    if (Array.isArray(payload.securityAnswers) && payload.securityAnswers.length > 0) {
      // remove existing
      await this.answerRepo.delete({ userId: user.id });
      for (const a of payload.securityAnswers) {
        const answerHash = crypto.createHmac('sha256', securitySecret).update((a.answer || '').trim()).digest('hex');
        const sa = this.answerRepo.create({ userId: user.id, questionKey: a.questionKey, answerHash } as any);
        await this.answerRepo.save(sa);
      }
    }

    return { message: 'Security data updated' };
  }

  // Utility: generate a human-usable temporary password (12 chars)
  private generateTempPassword(length = 12) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }
}