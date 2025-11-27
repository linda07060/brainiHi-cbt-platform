import { Injectable, ForbiddenException } from '@nestjs/common';
import { SettingsService } from '../modules/settings/settings.service';

/**
 * Minimal PlanEnforcementService (safe & non-invasive).
 *
 * - Only depends on SettingsService (which is registered via SettingsModule).
 * - Does not require an external usage/metrics service to be injected, so Nest will not fail when resolving providers.
 * - Performs conservative checks that can be done with static per-plan limits saved in admin settings (e.g. questionCountMax).
 * - For runtime usage-based checks (tests per day, explanations per month) you can wire a usageService later.
 */
@Injectable()
export class PlanEnforcementService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Check if the user (object with id and plan fields) is allowed to create a test
   * requesting `questionCount` questions.
   * Throws ForbiddenException on violation.
   *
   * NOTE: This implementation only enforces checks that do not require a usage/metrics service
   * (for example questionCountMax). If you want checks that depend on historical usage
   * (tests today, explanations this month), pass or inject a usage service later and add those checks.
   */
  async checkBeforeCreateTest(user: any, questionCount = 1) {
    const settings = await this.settingsService.getSettings();
    if (!settings || !settings.limits || !settings.limits.enforcePlanLimits) {
      // enforcement disabled -> allow
      return true;
    }

    const planRaw = (user?.plan || 'free');
    const planKey = String(planRaw).toLowerCase();
    const limits = settings.limits.perPlan?.[planKey] ?? {};

    // questionCountMax
    if (typeof limits.questionCountMax === 'number' && Number.isFinite(limits.questionCountMax)) {
      if (questionCount > limits.questionCountMax) {
        throw new ForbiddenException('Requested question count exceeds plan limit.');
      }
    }

    // NOTE:
    // - We intentionally do NOT attempt to check testsPerDay or explanationsPerMonth here,
    //   because those checks require knowledge of current user usage (e.g. testsToday).
    // - When you have a concrete usageService available in your app, inject it (or pass it in)
    //   and add the testsPerDay/explanationsPerMonth logic using that service.
    //
    // Example (pseudo):
    // const testsToday = await this.usageService?.getTestsToday(user.id) ?? 0;
    // if (typeof limits.testsPerDay === 'number' && testsToday + 1 > limits.testsPerDay) { throw ... }

    return true;
  }
}