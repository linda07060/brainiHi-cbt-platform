import { Controller, Post, Body, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  /**
   * Registration endpoint
   * Accepts:
   *  {
   *    name,
   *    email,
   *    phone,
   *    password,
   *    plan,
   *    recoveryPassphrase,
   *    securityAnswers: [{ questionKey, answer }, ...] // expect 3 items
   *  }
   *
   * Returns login payload (access_token + user).
   */
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
  getProfile(@Req() req) {
    return req.user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
  }

  /**
   * Change email (authenticated)
   * Body: { newEmail }
   */
  @Post('change-email')
  @UseGuards(JwtAuthGuard)
  async changeEmail(@Req() req, @Body() body: { newEmail: string }) {
    return this.authService.changeEmail(req.user.sub, body.newEmail);
  }

  // --- Google OAuth endpoints ---
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const data = await this.authService.validateGoogleUser(req.user);
    // For SPA: redirect to frontend with JWT as a query param
    return res.redirect(`${process.env.FRONTEND_ORIGIN}/login?token=${data.access_token}`);
  }

  // Public config endpoint so frontend can adapt copy / behavior
  // Example: hide "we'll email you" messaging when no SMTP is configured.
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