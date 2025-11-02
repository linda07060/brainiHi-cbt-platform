import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { SecurityResetService } from './security-reset.service';

/**
 * Public endpoints:
 * POST /auth/security-reset/initiate   { identifier }
 * POST /auth/security-reset/verify     { identifier, answers: [{questionKey, answer}], recoveryPassphrase? }
 * POST /auth/security-reset/confirm    { token, password }
 */
@Controller('auth/security-reset')
export class SecurityResetController {
  constructor(private readonly svc: SecurityResetService) {}

  @Post('initiate')
  async initiate(@Body('identifier') identifier: string) {
    return this.svc.initiate(identifier);
  }

  @Post('verify')
  async verify(@Body() body: { identifier: string; answers: Array<{ questionKey: string; answer: string }>; recoveryPassphrase?: string }) {
    const { identifier, answers, recoveryPassphrase } = body || {};
    if (!identifier || !answers) throw new BadRequestException('identifier and answers required');
    return this.svc.verify(identifier, answers, recoveryPassphrase);
  }

  @Post('confirm')
  async confirm(@Body() body: { token: string; password: string }) {
    const { token, password } = body || {};
    return this.svc.confirm(token, password);
  }
}