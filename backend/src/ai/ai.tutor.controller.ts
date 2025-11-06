import { Controller, Post, Body, UseGuards, Req, Get, Query, ForbiddenException } from '@nestjs/common';
import { AiTutorService } from './ai.tutor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from '../user/user.service';

@Controller('ai')
export class AiTutorController {
  constructor(private readonly tutor: AiTutorService, private readonly userService: UserService) {}

  private async ensureTutorPlan(userId: number) {
    const user = await this.userService.findById(userId);
    const plan = user?.plan ?? 'Free';
    if (!plan || String(plan).toLowerCase() !== 'tutor') {
      throw new ForbiddenException('Personal AI Tutor is available only for Tutor plan users — please upgrade to access this feature.');
    }
  }

  @Post('tutor-chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Req() req, @Body() body: { message: string; conversationId?: number }) {
    const userId = req.user.sub;
    await this.ensureTutorPlan(userId);
    return this.tutor.sendTutorMessage(userId, body.message, body.conversationId);
  }

  @Get('tutor-history')
  @UseGuards(JwtAuthGuard)
  async history(@Req() req, @Query('conversationId') conversationId?: number) {
    const userId = req.user.sub;
    await this.ensureTutorPlan(userId);
    return this.tutor.getConversation(userId, conversationId ? Number(conversationId) : undefined);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async analytics(@Req() req) {
    const userId = req.user.sub;
    await this.ensureTutorPlan(userId);
    return this.tutor.computeWeakAreas(userId);
  }

  // GET /ai/usage - return usage computed using the authoritative user plan from the DB
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async usage(@Req() req) {
    const userId = req.user.sub;
    const user = await this.userService.findById(userId);
    const plan = user?.plan ?? 'Free';
    return this.tutor.getUsageForDisplay(userId, plan);
  }
}