import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { PaymentsService } from '../../payments/payments.service';

/**
 * PaidAccessGuard
 *
 * Behavior:
 * - If the user's plan resolves to Free (case-insensitive contains 'free'), allow access immediately.
 * - Otherwise call PaymentsService.checkAccess(userId) and allow only if the returned object's `allowed` is true.
 *
 * Notes:
 * - Expects JwtAuthGuard to have run first and attached req.user.
 * - Be conservative for unknown/paid plans: require checkAccess to succeed.
 */
@Injectable()
export class PaidAccessGuard implements CanActivate {
  private readonly logger = new Logger(PaidAccessGuard.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req?.user;

    if (!user) {
      this.logger.warn('PaidAccessGuard: no user on request; denying access');
      throw new ForbiddenException('Authentication required');
    }

    // Try to resolve a plan label from many possible shapes
    const planResolved = this.resolvePlanFromUser(user);
    const planLabel = (planResolved ?? '').toString().trim();
    const planLower = planLabel.toLowerCase();

    // If we resolved the plan and it is explicitly Free, allow immediately
    if (planLower.includes('free') || planLower === '') {
      this.logger.debug(`PaidAccessGuard: plan resolved as Free ("${planLabel}"), allowing access.`);
      return true;
    }

    // For non-free plans require PaymentsService check
    const rawUserId = user?.sub ?? user?.id ?? user?.userId ?? null;
    const userId = typeof rawUserId === 'string' ? Number(rawUserId) : rawUserId;
    if (!userId || Number.isNaN(Number(userId))) {
      this.logger.warn('PaidAccessGuard: invalid or missing user id; denying access');
      throw new ForbiddenException('Authentication required');
    }

    try {
      // Note: paymentsService.checkAccess returns a structured object (not a plain boolean).
      // Inspect the returned.allowed property.
      const accessInfo: any = await this.paymentsService.checkAccess(Number(userId));
      const allowed = accessInfo && typeof accessInfo.allowed === 'boolean' ? accessInfo.allowed : Boolean(accessInfo?.allowed ?? false);

      if (allowed) {
        this.logger.debug(`PaidAccessGuard: paymentsService.checkAccess.allowed === true for userId=${userId}; allowing access.`);
        return true;
      }

      this.logger.debug(`PaidAccessGuard: paymentsService.checkAccess.allowed === false for userId=${userId}; denying access.`);
      throw new ForbiddenException('Payment required');
    } catch (err: any) {
      // If the payments service fails, we deny for paid plans (safe default).
      this.logger.warn('PaidAccessGuard: error while checking payments service', err?.message ?? err);
      throw new ForbiddenException('Payment required');
    }
  }

  // Derive plan from many possible locations (mirrors frontend heuristics)
  private resolvePlanFromUser(user: any): string | null {
    if (!user || typeof user !== 'object') return null;
    const tryStr = (v: any) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

    // common direct keys
    const direct = [
      user.plan,
      user.planName,
      user.plan_name,
      user.subscription?.plan,
      user.subscription?.name,
      user.subscription?.product?.name,
      user.subscription_plan,
      user.metadata?.plan,
      user.meta?.plan,
      user.profile?.plan,
      user.account?.plan,
      user.membership?.plan,
      user.tier,
      user.role,
      user?.paymentStatus?.plan,
      user?.payment?.plan,
    ];
    for (const c of direct) {
      const s = tryStr(c);
      if (s) return s;
    }

    // subscriptions array
    try {
      if (Array.isArray(user.subscriptions) && user.subscriptions.length > 0) {
        for (const sub of user.subscriptions) {
          const s = tryStr(sub?.plan ?? sub?.name ?? sub?.product?.name);
          if (s) return s;
        }
      }
    } catch {}

    // nested containers
    const nested = [
      user.data?.plan,
      user.data?.subscription?.plan,
      user.settings?.plan,
      user.attributes?.plan,
      user.info?.plan,
      user.subscriptionInfo?.plan,
      user.profile?.planName,
    ];
    for (const c of nested) {
      const s = tryStr(c);
      if (s) return s;
    }

    // token claims
    const tokenClaims = user?.claims ?? user?.tokenClaims ?? user?.payload ?? null;
    if (tokenClaims && typeof tokenClaims === 'object') {
      const s = tryStr(tokenClaims.plan) ?? tryStr(tokenClaims.planName) ?? tryStr(tokenClaims.subscription);
      if (s) return s;
    }

    return null;
  }
}