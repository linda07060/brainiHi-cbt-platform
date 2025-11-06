import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/generate-test
   * Accepts body: { topic, difficulty?, questionCount?, question_count?, count?, useExplanations? }
   * - Normalizes common count keys and passes a numeric questionCount to AiService.generateTest.
   */
  @Post('generate-test')
  @UseGuards(JwtAuthGuard)
  async generate(@Req() req, @Body() body: any) {
    const topic: string = String(body?.topic ?? 'General');
    const difficulty: string = String(body?.difficulty ?? 'beginner');

    // Accept multiple common names for the requested count
    const rawCount = body?.questionCount ?? body?.question_count ?? body?.count ?? undefined;
    let questionCount: number | undefined = undefined;
    if (typeof rawCount === 'number' && !Number.isNaN(rawCount)) questionCount = Math.max(1, Math.floor(rawCount));
    else if (typeof rawCount === 'string' && rawCount.trim() !== '') {
      const n = Number(rawCount);
      if (!Number.isNaN(n)) questionCount = Math.max(1, Math.floor(n));
    }

    // Call the AiService with the (optional) questionCount. AiService defaults to 5 if undefined.
    const questions = typeof questionCount === 'number'
      ? await this.aiService.generateTest(topic, difficulty, questionCount)
      : await this.aiService.generateTest(topic, difficulty);

    return { questions };
  }
}