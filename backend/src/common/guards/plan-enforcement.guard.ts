import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { EnforcementService } from '../../modules/enforcement/enforcement.service';

/**
 * PlanEnforcementGuard
 * - Call enforcementService.checkCreateTest(userId, questionCount)
 * - If enforcement blocks, throws ForbiddenException
 * - If no authenticated user present, lets auth guards handle it (returns true)
 */
@Injectable()
export class PlanEnforcementGuard implements CanActivate {
  constructor(private readonly enforcementService: EnforcementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user;
    if (!user) {
      // Not authenticated here — let the JwtAuthGuard handle authentication/authorization.
      return true;
    }

    // Robust extraction of numeric user id from common payload shapes
    const maybeId =
      (user && (user.sub ?? user.id)) ??
      (user.user && (user.user.sub ?? user.user.id)) ??
      (user.payload && (user.payload.sub ?? user.payload.id)) ??
      null;

    const userId = typeof maybeId === 'string' ? Number(maybeId) : maybeId;
    if (!userId || Number.isNaN(userId)) {
      // If we can't find a user id, allow the request to proceed and let other guards/services handle it.
      return true;
    }

    // Determine a reasonable questionCount from request body if present.
    // Many endpoints use questionCount, question_count or count keys.
    const body: any = (req as any).body ?? {};
    const rawCount = body?.questionCount ?? body?.question_count ?? body?.count ?? undefined;
    let questionCount = 0;
    if (typeof rawCount === 'number' && !Number.isNaN(rawCount)) questionCount = Math.max(0, Math.floor(rawCount));
    else if (typeof rawCount === 'string' && rawCount.trim() !== '') {
      const n = Number(rawCount);
      if (!Number.isNaN(n)) questionCount = Math.max(0, Math.floor(n));
    } else if (Array.isArray(body?.questions)) {
      questionCount = body.questions.length;
    }

    try {
      // EnforcementService.checkCreateTest expects (userId: number, questionCount: number)
      await this.enforcementService.checkCreateTest(Number(userId), questionCount);
      return true;
    } catch (err: any) {
      // Rethrow as Forbidden so controllers return 403
      throw new ForbiddenException(err?.message || 'Plan limits enforced');
    }
  }
}