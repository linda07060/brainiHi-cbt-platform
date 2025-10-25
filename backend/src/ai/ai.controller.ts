import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-test')
  @UseGuards(JwtAuthGuard)
  async generate(@Req() req, @Body() body: { topic: string; difficulty: string }) {
    return { questions: await this.aiService.generateTest(body.topic, body.difficulty) };
  }
}