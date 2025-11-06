import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
  Param,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { TestService } from './test.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from '../user/user.service';

@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService, private readonly userService: UserService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async myTests(@Req() req: any) {
    const userId = extractUserId(req);
    if (!userId) throw new UnauthorizedException('Invalid user');
    return this.testService.listUserTests(userId);
  }

  /**
   * Submit a completed test.
   * Expects body: { answers, questions, topic, difficulty }
   * Ensures authoritative user plan is passed to the service and maps the service response
   * into a top-level shape expected by the frontend (id, score, total, questions, warning?).
   */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  async submit(
    @Req() req: any,
    @Body() body: { answers: any; questions: any; topic: string; difficulty: string },
  ) {
    const userId = extractUserId(req);
    if (!userId) throw new UnauthorizedException('Invalid user');

    // load authoritative user record to obtain plan (ensures proper plan rules applied)
    let plan: string | undefined;
    try {
      const user = await this.userService.findById(userId);
      plan = user?.plan ?? undefined;
    } catch {
      plan = undefined;
    }

    // Call service with plan so it can apply plan-specific logic (Tutor soft-limits, etc.)
    const svcRes = await this.testService.submitTest(
      userId,
      `${body.topic} (${body.difficulty})`,
      body.questions,
      body.answers,
      plan,
    );

    // Normalise service response to top-level shape expected by frontend TestSubmission.
    // Service returns { attempt, warning? } (attempt contains id/score/questions).
    if (svcRes && typeof svcRes === 'object' && 'attempt' in svcRes && svcRes.attempt) {
      const attempt: any = (svcRes as any).attempt;
      const responseBody: any = {
        id: attempt?.id ?? null,
        score: attempt?.score ?? null,
        total: Array.isArray(attempt?.questions) ? attempt.questions.length : null,
        questions: attempt?.questions ?? null,
      };
      if ((svcRes as any).warning) responseBody.warning = (svcRes as any).warning;
      return responseBody;
    }

    // Backwards-compatibility: if service returned top-level fields directly (older shape)
    if (svcRes && typeof svcRes === 'object' && ('id' in svcRes || 'score' in svcRes || 'questions' in svcRes)) {
      const asAny: any = svcRes as any;
      return {
        id: asAny.id ?? null,
        score: asAny.score ?? null,
        total: Array.isArray(asAny.questions) ? asAny.questions.length : null,
        questions: asAny.questions ?? null,
      };
    }

    // Fallback: return whatever the service returned
    return svcRes;
  }

  /**
   * Review endpoint: return a saved attempt by numeric id.
   * Route: GET /tests/:id/review
   */
  @Get(':id/review')
  @UseGuards(JwtAuthGuard)
  async review(@Req() req: any, @Param('id') id: string) {
    const numericId = typeof id === 'string' ? Number(id) : id;
    if (!numericId || Number.isNaN(numericId)) {
      throw new BadRequestException('Invalid review id');
    }
    return this.testService.reviewTest(numericId);
  }

  /**
   * Create a test from AI, persist a TestAttempt (status 'started'), and return sessionId and optionally questions.
   * Request body supports questionCount, question_count, count keys.
   */
  @Post('create-from-ai')
  @UseGuards(JwtAuthGuard)
  async createFromAi(@Req() req: any, @Body() body: any) {
    const userId = extractUserId(req);
    if (!userId) {
      throw new UnauthorizedException('Invalid or missing authenticated user id (re-login required)');
    }

    // Load user to obtain plan and ensure user exists
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const plan = user?.plan ?? 'Free';
    const topic = body.topic || 'General';
    const difficulty = body.difficulty || 'medium';

    // Normalize question count keys
    const rawCount = body?.questionCount ?? body?.question_count ?? body?.count ?? undefined;
    let questionCount: number | undefined = undefined;
    if (typeof rawCount === 'number' && !Number.isNaN(rawCount)) questionCount = Math.max(1, Math.floor(rawCount));
    else if (typeof rawCount === 'string' && rawCount.trim() !== '') {
      const n = Number(rawCount);
      if (!Number.isNaN(n)) questionCount = Math.max(1, Math.floor(n));
    }

    try {
      const attempt = await this.testService.createFromAI(userId, topic, difficulty, plan, questionCount);

      const responseBody: any = { sessionId: attempt.id ?? null };
      if (attempt && attempt.questions && Array.isArray(attempt.questions) && attempt.questions.length > 0) {
        responseBody.questions = attempt.questions;
      }

      return responseBody;
    } catch (err: any) {
      if (err?.status && err?.response) {
        throw err;
      }
      // eslint-disable-next-line no-console
      console.error('createFromAi failed', err);
      throw new InternalServerErrorException('Failed to save generated test session');
    }
  }
}

/**
 * Helper: robustly extract numeric user id from the token payload in req.user
 */
function extractUserId(req: any): number | null {
  const raw = req?.user ?? {};
  const maybeId =
    raw.sub ??
    raw.id ??
    (raw.user && (raw.user.sub ?? raw.user.id)) ??
    (raw.payload && (raw.payload.sub ?? raw.payload.id)) ??
    null;

  const userId = typeof maybeId === 'string' ? Number(maybeId) : maybeId;
  if (!userId || Number.isNaN(userId)) return null;
  return userId;
}