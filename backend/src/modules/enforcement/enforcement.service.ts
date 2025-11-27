import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class EnforcementService {
  private readonly logger = new Logger(EnforcementService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  private async getSettings() {
    try {
      return await this.settingsService.getSettings();
    } catch (err) {
      this.logger.warn('Failed to read settings for enforcement; allowing by default.', err as any);
      return null;
    }
  }

  // Check whether the user can create a new test with questionCount questions
  // Throws HttpException(403) when limit exceeded.
  async checkCreateTest(userId: number, questionCount = 0) {
    const settings = await this.getSettings();
    const enforce = !!settings?.limits?.enforcePlanLimits;
    if (!enforce) return; // no enforcement requested

    // Determine user's plan - you may have this stored on the user record.
    // This function expects the caller to pass userId; adapt to your user schema if needed.
    const plan = await this.getUserPlan(userId);

    const perPlanLimits = settings?.limits?.perPlan ?? {};
    const planLimits = perPlanLimits?.[plan] ?? {};
    const testsPerDayLimit = Number(planLimits?.testsPerDay ?? 0);

    if (!testsPerDayLimit || testsPerDayLimit <= 0) {
      // unlimited or not configured -> allow
      return;
    }

    try {
      const res = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt
         FROM "test"
         WHERE "userId" = $1
           AND "createdAt" >= now() - interval '24 hours'`,
        [userId],
      );
      const used = Number(res?.[0]?.cnt || 0);
      if (used + 1 > testsPerDayLimit) {
        throw new HttpException(
          `Test creation blocked: daily tests limit reached (${used}/${testsPerDayLimit})`,
          HttpStatus.FORBIDDEN,
        );
      }
      // Optionally also check per-test questionCount vs questionCountMax
      const questionsLimit = Number(planLimits?.questionCountMax ?? 0);
      if (questionsLimit > 0 && questionCount > questionsLimit) {
        throw new HttpException(
          `Test creation blocked: question count (${questionCount}) exceeds plan max (${questionsLimit})`,
          HttpStatus.FORBIDDEN,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // If the test table doesn't exist or query fails, log and allow by default
      this.logger.warn('Enforcement checkCreateTest failed (allowing).', err as any);
      return;
    }
  }

  // Check whether the user can attempt a given test (attemptsPerTest limit)
  async checkAttemptTest(userId: number, testId: number) {
    const settings = await this.getSettings();
    const enforce = !!settings?.limits?.enforcePlanLimits;
    if (!enforce) return;

    const plan = await this.getUserPlan(userId);
    const perPlanLimits = settings?.limits?.perPlan ?? {};
    const planLimits = perPlanLimits?.[plan] ?? {};
    const attemptsLimit = Number(planLimits?.attemptsPerTest ?? 0);

    if (!attemptsLimit || attemptsLimit <= 0) return;

    try {
      // assuming you store each attempt in "test_attempt" table with userId and testId
      const res = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt
         FROM "test_attempt"
         WHERE "userId" = $1 AND "testId" = $2`,
        [userId, testId],
      );
      const used = Number(res?.[0]?.cnt || 0);
      if (used + 1 > attemptsLimit) {
        throw new HttpException(
          `Attempt blocked: attempts for this test exceeded (${used}/${attemptsLimit})`,
          HttpStatus.FORBIDDEN,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn('Enforcement checkAttemptTest failed (allowing).', err as any);
      return;
    }
  }

  // Check whether the user can request an explanation (explanations per month)
  async checkExplain(userId: number) {
    const settings = await this.getSettings();
    const enforce = !!settings?.limits?.enforcePlanLimits;
    if (!enforce) return;

    const plan = await this.getUserPlan(userId);
    const perPlanLimits = settings?.limits?.perPlan ?? {};
    const planLimits = perPlanLimits?.[plan] ?? {};
    const explanationsLimit = Number(planLimits?.explanationsPerMonth ?? 0);

    if (!explanationsLimit || explanationsLimit <= 0) return;

    try {
      // Count explanation uses from ai_log table in the current month.
      // This assumes ai_log has userId and response contains an indicator of explanation actions.
      // Adjust the WHERE clause if your schema differs.
      const res = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt
         FROM ai_log
         WHERE "userId" = $1
           AND "createdAt" >= date_trunc('month', now())`,
        [userId],
      );
      const used = Number(res?.[0]?.cnt || 0);
      if (used + 1 > explanationsLimit) {
        throw new HttpException(
          `Explanation blocked: monthly explanations limit reached (${used}/${explanationsLimit})`,
          HttpStatus.FORBIDDEN,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn('Enforcement checkExplain failed (allowing).', err as any);
      return;
    }
  }

  // Helper: get user plan - adapt to your users table schema as needed
  private async getUserPlan(userId: number): Promise<string> {
    try {
      const res = await this.dataSource.query(
        `SELECT plan FROM "user" WHERE id = $1 LIMIT 1`,
        [userId],
      );
      const plan = res?.[0]?.plan || 'free';
      return String(plan);
    } catch (err) {
      this.logger.warn('Failed to read user plan; defaulting to "free".', err as any);
      return 'free';
    }
  }
}