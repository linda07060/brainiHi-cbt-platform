import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Admin } from './admin.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { User } from '../user/user.entity';
import { SecurityAnswer } from '../security-reset/security-answer.entity';
import { AdminUsersService } from './admin-users.service';

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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    // inject AdminUsersService so we can fallback by-email when SQL returns no rows
    private readonly adminUsersService: AdminUsersService,
  ) {}

  // Admin login (returns access_token)
  async login({ email, password }: { email: string; password: string }) {
    const emailNorm = (email || '').toString().trim().toLowerCase();
    const admin = await this.adminRepo.findOne({ where: { email: emailNorm } });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const provided = (password || '').toString();
    const stored = (admin.password || '').toString();
    let match = false;
    try {
      if (stored.startsWith('$2') || stored.startsWith('$argon')) {
        match = await bcrypt.compare(provided, stored);
      } else {
        match = stored === provided;
        if (match) {
          try {
            const hashed = await bcrypt.hash(provided, 10);
            admin.password = hashed;
            await this.adminRepo.save(admin);
          } catch {}
        }
      }
    } catch {
      match = false;
    }

    if (!match) {
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

    const recentSignups = await this.userRepo.find({
      take: 6,
      order: { id: 'DESC' },
      select: ['id', 'user_uid', 'name', 'email', 'plan'],
    });

    // Attempt to read login activity first; if none, fallback to signups as activity.
    let recentActivity: any[] = [];
    let activitySource: 'sql' | 'per-email' | 'fallback-signups' = 'fallback-signups';

    try {
      const rows: any[] = await this.dataSource.query(
        `SELECT id, user_id, email, ip, user_agent, created_at
         FROM user_login_activity
         ORDER BY created_at DESC
         LIMIT 6`,
      );

      // DEBUG: show what we retrieved (non-production only)
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[AdminService.getStats] user_login_activity rows fetched:', Array.isArray(rows) ? rows.length : 0, rows && rows.slice ? rows.slice(0,3) : rows);
      }

      if (Array.isArray(rows) && rows.length > 0) {
        activitySource = 'sql';
        recentActivity = rows.map((r) => ({
          id: r.id ?? null,
          type: 'login',
          object_type: 'user',
          object_id: r.user_id ?? null,
          actor_email: r.email ?? null,
          ip: r.ip ?? null,
          user_agent: r.user_agent ?? null,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
          description: `${r.email ?? `user ${r.user_id ?? 'unknown'}`} logged in${r.ip ? ` from ${r.ip}` : ''}`,
        }));
      } else {
        // If direct SQL returned no rows, attempt a per-signup email fallback using AdminUsersService.
        // This helps surface login events even when the top-level query returned zero (e.g., schema/permission mismatch).
        const perEmailRows: any[] = [];
        for (const s of recentSignups) {
          try {
            const email = s?.email ?? null;
            if (!email) continue;
            const ar = await this.adminUsersService.getActivityByEmail(String(email).trim());
            if (Array.isArray(ar) && ar.length > 0) {
              perEmailRows.push(...ar);
            }
          } catch (e) {
            // swallow per-email errors (non-fatal)
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.debug('[AdminService.getStats] per-email activity fetch failed for', s?.email, e);
            }
          }
          // stop early if we accumulated enough rows
          if (perEmailRows.length >= 6) break;
        }

        if (perEmailRows.length > 0) {
          activitySource = 'per-email';
          recentActivity = perEmailRows.slice(0, 6).map((r) => ({
            id: r.id ?? null,
            type: 'login',
            object_type: 'user',
            object_id: r.user_id ?? null,
            actor_email: r.email ?? null,
            ip: r.ip ?? null,
            user_agent: r.user_agent ?? null,
            created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
            description: `${r.email ?? `user ${r.user_id ?? 'unknown'}`} logged in${r.ip ? ` from ${r.ip}` : ''}`,
          }));
        } else {
          // fallback to recent signups so the dashboard is not empty
          activitySource = 'fallback-signups';
          recentActivity = recentSignups.map((s: any) => ({
            id: `signup-${s.id}`,
            type: 'signup',
            object_type: 'user',
            object_id: s.id ?? null,
            actor_email: s.email ?? null,
            ip: null,
            user_agent: null,
            created_at: (s as any).createdAt ? new Date((s as any).createdAt).toISOString() : null,
            description: `${s.email ?? `user ${s.id ?? 'unknown'}`} signed up`,
          }));
        }
      }
    } catch (err) {
      // If the query fails, fallback to recent signups (log error in dev only)
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[AdminService.getStats] failed to fetch user_login_activity, falling back to signups', err);
      }
      activitySource = 'fallback-signups';
      recentActivity = recentSignups.map((s: any) => ({
        id: `signup-${s.id}`,
        type: 'signup',
        object_type: 'user',
        object_id: s.id ?? null,
        actor_email: s.email ?? null,
        ip: null,
        user_agent: null,
        created_at: (s as any).createdAt ? new Date((s as any).createdAt).toISOString() : null,
        description: `${s.email ?? `user ${s.id ?? 'unknown'}`} signed up`,
      }));
    }

    return {
      totalUsers,
      activeUsers,
      plansSummary,
      recentSignups,
      recentActivity,
      // diagnostic metadata (non-breaking; clients that ignore these are unaffected)
      recentActivitySource: activitySource,
      recentActivityCount: recentActivity.length,
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

    const allowed: (keyof User)[] = ['name', 'email', 'plan', 'level'];
    for (const key of allowed) {
      if (payload[key] !== undefined) {
        (user as any)[key] = payload[key];
      }
    }
    if ((payload as any).phone !== undefined) (user as any).phone = (payload as any).phone;
    if ((payload as any).active !== undefined) (user as any).active = (payload as any).active;

    await this.userRepo.save(user);
    return { message: 'User updated', user };
  }

  // Admin resets password
  async resetPassword(id: number, newPassword?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const passwordToSet = newPassword && newPassword.length >= 8 ? newPassword : this.generateTempPassword();
    const hashed = await bcrypt.hash(passwordToSet, 10);
    user.password = hashed;
    await this.userRepo.save(user);

    return { message: 'Password reset', tempPassword: passwordToSet };
  }

  async resetSecurity(id: number, payload: { recoveryPassphrase?: string; securityAnswers?: Array<{ questionKey: string; answer: string }> }) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const securitySecret = this.configService.get<string>('SECURITY_SECRET');
    if (!securitySecret) throw new InternalServerErrorException('SECURITY_SECRET not configured');

    if (payload.recoveryPassphrase !== undefined) {
      const rpHash = crypto.createHmac('sha256', securitySecret).update((payload.recoveryPassphrase || '').trim()).digest('hex');
      (user as any).recoveryPassphraseHash = rpHash;
      await this.userRepo.save(user);
    }

    if (Array.isArray(payload.securityAnswers) && payload.securityAnswers.length > 0) {
      await this.answerRepo.delete({ userId: user.id });
      for (const a of payload.securityAnswers) {
        const answerHash = crypto.createHmac('sha256', securitySecret).update((a.answer || '').trim()).digest('hex');
        const sa = this.answerRepo.create({ userId: user.id, questionKey: a.questionKey, answerHash } as any);
        await this.answerRepo.save(sa);
      }
    }

    return { message: 'Security data updated' };
  }

  private generateTempPassword(length = 12) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }
}