import { Controller, Post, Body, Get, Req, UseGuards, Res, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../user/user.entity';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly ds: DataSource,
  ) {}

  /**
   * Helper: fetch the raw DB row for a user by id or email.
   * Use `SELECT *` so we don't reference columns that may not exist in some schemas
   * (avoids QueryFailedError when DB has different column names like no updated_at).
   * We still normalize the returned row to read require/security flags reliably.
   */
  private async fetchUserRow(idCandidate?: any, emailCandidate?: any): Promise<any | null> {
    try {
      if (idCandidate) {
        const idNum = Number(idCandidate);
        if (!Number.isNaN(idNum)) {
          // Use SELECT * to avoid selecting non-existent columns.
          const sql = `SELECT * FROM "user" WHERE id = $1 LIMIT 1`;
          const rows = await this.ds.query(sql, [idNum]);
          if (Array.isArray(rows) && rows.length > 0) return rows[0];
        }
      }

      if (emailCandidate) {
        const emailNorm = String(emailCandidate).toLowerCase();
        const sql = `SELECT * FROM "user" WHERE lower(email) = $1 LIMIT 1`;
        const rows = await this.ds.query(sql, [emailNorm]);
        if (Array.isArray(rows) && rows.length > 0) return rows[0];
      }

      return null;
    } catch (err) {
      // Log a focused warning and return null so callers fall back to repo/jwt payload.
      this.logger.warn('fetchUserRow failed', err as any);
      return null;
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Req() req: Request) {
    const result: any = await this.authService.login(body);

    // Fire-and-forget: record login activity using the returned JWT payload (contains sub/email).
    // Be defensive: if result.user is not present, construct a minimal payload from result.
    try {
      const payload = (result && (result as any).user)
        ? (result as any).user
        : // fallback: try to extract from common shapes
          {
            sub: (result && (result as any).sub) || null,
            email: (result && (result as any).user && (result as any).user.email) || body.email || null,
          };

      // Only call if we at least have an email or sub
      if (payload && (payload.sub || payload.email)) {
        // do not await; swallow any rejection so login isn't blocked
        this.authService.recordLoginFromPayload(payload, req).catch(() => {});
      }
    } catch {
      // swallow any synchronous errors
    }

    // Normalize response so frontend can detect require_security_setup and require_passphrase_setup reliably.
    // Determine token and user payload from result in common shapes.
    const token = result?.access_token ?? result?.token ?? result?.accessToken ?? null;
    const returnedUser = result?.user ?? result;

    let freshUser: any = null;
    try {
      // Try to resolve a fresh user record from DB to pick up current require flags.
      const idCandidate = (returnedUser && (returnedUser.id ?? returnedUser.sub ?? returnedUser.user_id)) ?? null;
      const emailCandidate = (returnedUser && (returnedUser.email ?? returnedUser.user_email)) ?? body.email ?? null;

      // Prefer raw DB row (explicit select) so we pick up exact DB columns and values
      freshUser = await this.fetchUserRow(idCandidate, emailCandidate);

      // If explicit raw select didn't find anything, attempt ORM repository (fallback)
      if (!freshUser) {
        if (idCandidate) {
          const idNum = Number(idCandidate);
          if (!Number.isNaN(idNum)) {
            freshUser = await this.ds.getRepository(User).findOne({ where: { id: idNum } } as any);
          }
        }
        if (!freshUser && emailCandidate) {
          freshUser = await this.ds.getRepository(User).findOne({ where: [{ email: String(emailCandidate).toLowerCase() }] } as any);
        }
      }
    } catch (err) {
      this.logger.warn('Failed to load fresh user record during login normalization', err as any);
      freshUser = null;
    }

    // Build sanitized user object to return to frontend (do not expose recovery hash to normal users)
    const src = freshUser ?? returnedUser ?? {};

    const sanitizedUser = {
      id: src.id ?? src.sub ?? null,
      email: src.email ?? null,
      name: src.name ?? null,
      // Expose normalized require flags (boolean)
      require_security_setup: !!(src.require_security_setup ?? src.requireSecuritySetup ?? false),
      require_passphrase_setup: !!(src.require_passphrase_setup ?? src.requirePassphraseSetup ?? false),
      securityConfigured: !!(src.securityConfigured ?? src.security_configured ?? false),
      // include any non-sensitive display fields the frontend might expect
      user_uid: src.user_uid ?? src.userUid ?? null,
      created_at: src.created_at ?? src.createdAt ?? null,
    };

    if (token) {
      return { access_token: token, user: sanitizedUser };
    }

    return { user: sanitizedUser };
  }

  @Post('register')
  async register(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      plan?: string;
      recoveryPassphrase: string;
      securityAnswers: Array<{ questionKey: string; answer: string }>;
    },
  ) {
    return this.authService.register(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    const jwtUser: any = (req as any).user ?? {};
    try {
      let freshUser: any = null;
      const idCandidate = jwtUser.sub ?? jwtUser.id ?? jwtUser.user_id;
      const emailCandidate = jwtUser.email ?? jwtUser.user_email;

      // Prefer explicit DB raw select to pick up actual stored require flags
      freshUser = await this.fetchUserRow(idCandidate, emailCandidate);

      // Fallback to repository if raw select didn't find anything
      if (!freshUser) {
        if (idCandidate) {
          const idNum = Number(idCandidate);
          if (!Number.isNaN(idNum)) {
            freshUser = await this.ds.getRepository(User).findOne({ where: { id: idNum } } as any);
          }
        }
        if (!freshUser && emailCandidate) {
          freshUser = await this.ds.getRepository(User).findOne({ where: [{ email: String(emailCandidate).toLowerCase() }] } as any);
        }
      }

      const src = freshUser ?? jwtUser;

      return {
        id: src.id ?? null,
        email: src.email ?? null,
        name: src.name ?? null,
        require_security_setup: !!(src.require_security_setup ?? src.requireSecuritySetup ?? false),
        require_passphrase_setup: !!(src.require_passphrase_setup ?? src.requirePassphraseSetup ?? false),
        securityConfigured: !!(src.securityConfigured ?? src.security_configured ?? false),
        user_uid: src.user_uid ?? src.userUid ?? null,
        created_at: src.created_at ?? src.createdAt ?? null,
      };
    } catch (err) {
      this.logger.warn('Failed to fetch fresh user record for /auth/me', err as any);
      return {
        id: jwtUser.sub ?? jwtUser.id ?? null,
        email: jwtUser.email ?? null,
        name: jwtUser.name ?? null,
        require_security_setup: !!(jwtUser.require_security_setup ?? jwtUser.requireSecuritySetup ?? false),
        require_passphrase_setup: !!(jwtUser.require_passphrase_setup ?? jwtUser.requirePassphraseSetup ?? false),
      };
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
  }

  @Post('change-email')
  @UseGuards(JwtAuthGuard)
  async changeEmail(@Req() req, @Body() body: { newEmail: string }) {
    return this.authService.changeEmail(req.user.sub, body.newEmail);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const data = await this.authService.validateGoogleUser(req.user);
    try {
      const payload = (data && (data as any).user) ? (data as any).user : { sub: (data as any).sub, email: (data as any).user?.email ?? req.user?.email };
      if (payload && (payload.sub || payload.email)) {
        this.authService.recordLoginFromPayload(payload, req).catch(() => {});
      }
    } catch {
      // swallow; do not prevent redirect
    }
    return res.redirect(`${process.env.FRONTEND_ORIGIN}/login?token=${data.access_token}`);
  }

  @Get('config')
  public getAuthConfig() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const mailEnabled = !!(smtpHost && smtpUser && smtpPass);
    const allowInsecure = String(this.configService.get('ALLOW_INSECURE_RESET') || '').toLowerCase() === 'true';
    return { mailEnabled, allowInsecure };
  }
}