// central plan limits used by TestService / AiTutorService / frontends
export type PlanName = 'Free' | 'Pro' | 'Tutor';

export type PlanLimits = {
  // tests per day: numeric or Infinity for unlimited
  testsPerDay: number | typeof Infinity;
  // questionCount: number of questions to request when generating tests
  questionCount: number;
  // attempts allowed per test
  attemptsPerTest: number | typeof Infinity;
  // AI explanations quota measured per month (use Infinity for unlimited)
  explanationsPerMonth: number | typeof Infinity;
  // timeLimit: optional (in seconds) or 'none'
  timeLimitPerTest?: number | 'none';
  // optional features
  features?: string[];
};

export function planLimits(plan?: string): PlanLimits {
  const p = (String(plan || 'Free')).trim();

  // Normalize known values (accept 'free','Free','FREE', etc.)
  const normalized = ((): PlanName => {
    const lower = p.toLowerCase();
    if (lower === 'pro') return 'Pro';
    if (lower === 'tutor') return 'Tutor';
    return 'Free';
  })();

  switch (normalized) {
    case 'Free':
      // As requested:
      // - 1 test per day
      // - 10 questions per test
      // - 1 attempt per test
      // - 3 AI explanations (we track monthly in DB; represent as 3 for the quota)
      return {
        testsPerDay: 1,
        questionCount: 10,
        attemptsPerTest: 1,
        explanationsPerMonth: 3, // small quota (frontend shows "3")
        timeLimitPerTest: 60 * 30, // optional: 30 minutes default
      };
    case 'Pro':
      // PRO limits:
      // - Unlimited tests
      // - 15–20 questions per test (we pick 20 as the upper bound for AI generation)
      // - 2 attempts per test
      // - 50 AI explanations / month
      // - no time limits during tests
      return {
        testsPerDay: Infinity,
        questionCount: 20,
        attemptsPerTest: 2,
        explanationsPerMonth: 50,
        timeLimitPerTest: 'none',
      };
    case 'Tutor':
      // TUTOR limits:
      // - Unlimited tests
      // - 20–30 questions per test (we pick 30 as the upper bound)
      // - Unlimited attempts
      // - 1000+ AI explanations / month (soft limit) -> represent as a large number
      // - personal AI tutor + full analytics
      return {
        testsPerDay: Infinity,
        questionCount: 30,
        attemptsPerTest: Infinity,
        explanationsPerMonth: 1000,
        timeLimitPerTest: 'none',
        features: ['personal_ai_tutor', 'full_analytics'],
      };
    default:
      return {
        testsPerDay: 1,
        questionCount: 10,
        attemptsPerTest: 1,
        explanationsPerMonth: 3,
        timeLimitPerTest: 60 * 30,
      };
  }
}