import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { TestService } from './test.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async myTests(@Req() req) {
    return this.testService.listUserTests(req.user.sub);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  async submit(@Req() req, @Body() body: { answers: any; questions: any; topic: string; difficulty: string }) {
    // Stub scoring logic
    const score = Math.floor(Math.random() * 100);
    return this.testService.submitTest(req.user.sub, `${body.topic} (${body.difficulty})`, body.questions, body.answers);
  }

  @Get(':id/review')
  @UseGuards(JwtAuthGuard)
  async review(@Req() req, @Query('id') id: number) {
    return this.testService.reviewTest(id);
  }
}