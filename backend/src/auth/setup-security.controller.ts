import { Controller, Post, Body, UseGuards, Req, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
import { SetupSecurityService } from './setup-security.service';

type QA = { questionKey: string; answer: string };

@Controller('auth')
export class SetupSecurityController {
  private readonly logger = new Logger(SetupSecurityController.name);

  constructor(private readonly svc: SetupSecurityService) {}

  /**
   * POST /auth/setup-security
   * Body: { securityAnswers: [{ questionKey, answer }, ...] }
   * Requires authentication; stores answers (hashed), clears require_security_setup,
   * sets securityConfigured = true and returns sanitized user.
   */
  @UseGuards(JwtAuthGuard)
  @Post('setup-security')
  async setupSecurity(@Req() req: Request, @Body() body: { securityAnswers?: QA[] }) {
    const userPayload = (req as any).user as any;
    const userId =
      userPayload?.id ??
      userPayload?.sub ??
      userPayload?.user_id ??
      userPayload?.userUid ??
      userPayload?.user_uid ??
      null;

    if (!userPayload || !userId) {
      throw new UnauthorizedException('Authenticated user required');
    }

    const answers = Array.isArray(body?.securityAnswers) ? body.securityAnswers : [];
    if (!answers || answers.length === 0) {
      throw new BadRequestException('Missing security answers');
    }

    // Basic validation: require at least 1 answer and non-empty strings
    for (const a of answers) {
      if (!a || !a.questionKey || typeof a.answer !== 'string' || a.answer.trim().length < 1) {
        throw new BadRequestException('Each security answer must include a questionKey and a non-empty answer');
      }
    }

    try {
      const updatedUser = await this.svc.saveSecurityAnswers(null, userId, answers, { ip: (req.ip as string) || null });
      return { message: 'Security answers saved', user: updatedUser };
    } catch (err) {
      this.logger.error('setupSecurity failed', err as any);
      throw new BadRequestException('Unable to save security answers');
    }
  }
}