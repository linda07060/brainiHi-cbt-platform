import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { GenerateV2Service } from './generate-v2.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class GenerateV2Controller {
  constructor(private readonly gen: GenerateV2Service) {}

  /**
   * POST /ai/generate-v2
   * Body: { topic, difficulty, session_id? }
   * Protected by JwtAuthGuard (authenticated user required)
   */
  @Post('generate-v2')
  @UseGuards(JwtAuthGuard)
  async generate(@Req() req, @Body() body: any) {
    const userId = req.user?.sub ? Number(req.user.sub) : undefined;
    const topic = (body?.topic || 'General').toString();
    const difficulty = (body?.difficulty || 'beginner').toString();
    const q = await this.gen.generateSingle(topic, difficulty, userId);
    return { question: q };
  }
}