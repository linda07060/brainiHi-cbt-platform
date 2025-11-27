import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { SecurityAnswer } from '../security-reset/security-answer.entity';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SecurityAnswer)
    private readonly answerRepo: Repository<SecurityAnswer>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    // Inject TypeORM DataSource so we can write login activity
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Validate user credentials.
   * Returns the user entity when valid, otherwise null.
   */
  public async validateUser(email: string, password: string) {
    const emailNorm = (email || '').toString().trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: emailNorm } });
    if (!user) return null;
    const matches = await bcrypt.compare(password, user.password);
    if (!matches) return null;
    return user;
  }

  /**
   * Login: validate credentials and return JWT + user payload.
   */
  public async login({ email, password }: { email: string; password: string }) {
    // normalize email before validation to avoid case/whitespace mismatches
    const emailNorm = (email || '').toString().trim().toLowerCase();

    const user = await this.validateUser(emailNorm, password);
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
      phone: user.phone ?? null,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
      }),
      user: payload,
    };
  }

  /**
   * Record a login row in user_login_activity table using the JWT payload (sub/email).
   * Defensive: returns quickly and swallows DB errors so it can't break login.
   * This method is intended to be called fire-and-forget from the controller after successful authentication.
   */
  public async recordLoginFromPayload(payload: any, req?: Request) {
    // TEMP debug: log invocation (safe in non-production; remove or lower verbosity for prod)
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[recordLoginFromPayload] called with payload.sub=', payload?.sub, 'email=', payload?.email);
    }

    if (!payload || !payload.sub || !payload.email) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[recordLoginFromPayload] missing sub/email; nothing to record');
      }
      return;
    }

    // determine IP: prefer X-Forwarded-For (proxy) then req.ip
    const forwarded = req ? ((req.headers['x-forwarded-for'] as string) || '') : '';
    const ip = forwarded ? forwarded.split(',')[0].trim() : (req ? (req.ip || null) : null);

    const ua = req ? ((req.headers['user-agent'] as string) || null) : null;

    try {
      await this.dataSource.query(
        `INSERT INTO user_login_activity (user_id, email, ip, user_agent, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [payload.sub ?? null, payload.email, ip, ua],
      );
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[recordLoginFromPayload] insert succeeded for user=', payload.sub);
      }
    } catch (err) {
      // Do not surface DB errors to the user; swallow silently but log in dev for visibility.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[recordLoginFromPayload] failed to write user_login_activity', err);
      }
      // swallow
    }
  }

  /**
   * Register a new user:
   * - creates unique user_uid
   * - stores phone, plan
   * - if billingPeriod provided and plan is not Free, sets plan_expiry (30d for monthly, 1y for yearly)
   * - hashes recoveryPassphrase with SECURITY_SECRET and saves it to user.recoveryPassphraseHash
   * - saves security answers in user_security_answer as HMAC hashed values
   * - returns login payload (access_token + user).
   */
  public async register(payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    plan?: string;
    billingPeriod?: 'monthly' | 'yearly';
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

    // compute plan_expiry if billingPeriod provided and plan is paid
    let planExpiry: Date | null = null;
    const planRaw = (payload.plan || 'Free').toString().trim();
    const planLower = planRaw.toLowerCase();
    const billing = payload.billingPeriod;

    if (planLower !== 'free' && billing) {
      const now = new Date();
      const expiry = new Date(now.getTime());
      if (billing === 'monthly') {
        expiry.setDate(expiry.getDate() + 30);
      } else if (billing === 'yearly') {
        expiry.setFullYear(expiry.getFullYear() + 1);
      }
      planExpiry = expiry;
    }

    // create user entity
    const user = this.userRepo.create({
      email,
      password: hash,
      name: payload.name,
      phone: payload.phone || null,
      plan: payload.plan || 'Free',
      plan_expiry: planExpiry,
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
  public async changePassword(id: number | string, oldPassword: string, newPassword: string) {
    const userId = Number(id);
    if (Number.isNaN(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const oldPwd = (oldPassword || '').trim();
    const newPwd = (newPassword || '').trim();

    const matches = await bcrypt.compare(oldPwd, user.password);

    if (process.env.NODE_ENV !== 'production') {
      try {
        const masked = (user.password || '').length > 12
          ? `${(user.password || '').slice(0,6)}...${(user.password || '').slice(-6)}`
          : user.password;
        // eslint-disable-next-line no-console
        console.log(`changePassword debug: userId=${userId} matches=${matches} storedHashPreview=${masked}`);
      } catch {}
    }

    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.password = await bcrypt.hash(newPwd, 10);
    await this.userRepo.save(user);
    return { message: 'Password changed' };
  }

  /**
   * Change email for authenticated user (protected)
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
        phone: googleProfile.phone || null,
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
      phone: user.phone ?? null,
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