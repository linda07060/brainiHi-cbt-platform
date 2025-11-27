import { Injectable, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestAttempt } from './test.entity';
import { AiService } from '../ai/ai.service';
import { AiUsage } from '../ai/ai-usage.entity';
import { planLimits } from '../plan/plan.constants';
import { allowedTopics, mathKeywords } from './math-topics';

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(TestAttempt)
    private readonly testRepo: Repository<TestAttempt>,
    @InjectRepository(AiUsage)
    private readonly usageRepo: Repository<AiUsage>,
    private readonly aiService: AiService,
  ) {}

  /**
   * Return the user's test attempts, ordered so the most recently taken (or created) appear first.
   * Use a queryBuilder with COALESCE so attempts with null takenAt still sort by createdAt.
   * Wrap in try/catch and log errors to make failures visible.
   */
  async listUserTests(userId: number) {
    try {
      // Use queryBuilder to order by COALESCE(takenAt, createdAt) DESC for robust ordering
      const attempts = await this.testRepo
        .createQueryBuilder('attempt')
        .where('attempt.userId = :userId', { userId })
        .orderBy('COALESCE(attempt."takenAt", attempt."createdAt")', 'DESC')
        .getMany();

      return Array.isArray(attempts) ? attempts : [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[TestService.listUserTests] DB query failed for userId=', userId, err?.message ?? err);
      return [];
    }
  }

  // -------------------------
  // Topic validation helpers
  // -------------------------
  private normalize(s: string) {
    return (s || '').trim().toLowerCase();
  }

  /**
   * Deterministic check whether a provided topic appears mathematics-related.
   * Strategy:
   *  - direct canonical match against allowedTopics
   *  - substring match against mathKeywords
   *  - tokenized match (split by punctuation/whitespace) and check tokens
   *
   * This is intentionally conservative and deterministic (no external NLP calls).
   * If you want fuzzy classification, add an OpenAI/ML fallback with a confidence threshold.
   */
  isMathTopic(topic: string | undefined | null): boolean {
    if (!topic || typeof topic !== 'string') return false;
    const norm = this.normalize(topic);

    // canonical match
    const canonicalSet = new Set(allowedTopics.map((t) => t.toLowerCase()));
    if (canonicalSet.has(norm)) return true;

    // substring keyword match
    for (const kw of mathKeywords) {
      if (norm.includes(kw.toLowerCase())) return true;
    }

    // tokenized match: covers inputs like "Algebra - solving equations"
    const tokens = norm.split(/[\s,;/:\-()]+/).filter(Boolean);
    for (const t of tokens) {
      if (canonicalSet.has(t)) return true;
      for (const kw of mathKeywords) {
        if (t.includes(kw.toLowerCase())) return true;
      }
    }

    return false;
  }

  /**
   * createFromAI generates a new test via AI, enforces plan limits, persists a TestAttempt (status 'started'), and increments usage.
   * Validation: enforces that topic must be mathematics-related before any AI call is attempted.
   */
  async createFromAI(userId: number, topic: string, difficulty: string, plan?: string, requestedQuestionCount?: number) {
    // Ensure userId is present
    const uid = typeof userId === 'string' ? Number(userId) : userId;
    if (!uid || Number.isNaN(uid)) {
      throw new BadRequestException('Invalid user id');
    }

    // Authoritative topic validation: enforce math-only topics here
    if (!this.isMathTopic(topic)) {
      throw new BadRequestException(
        'Topic must be mathematics-related (e.g. Algebra, Calculus, Probability). Please enter a math topic.'
      );
    }

    const limits = planLimits(plan);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Get or create AiUsage record
    let usage = await this.usageRepo.findOne({ where: { userId: uid } });
    if (!usage) {
      usage = this.usageRepo.create({ userId: uid, testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 });
    }

    if (usage.testsTodayDate !== today) {
      usage.testsTodayDate = today;
      usage.testsTodayCount = 0;
    }

    if (limits.testsPerDay !== Infinity && usage.testsTodayCount >= limits.testsPerDay) {
      throw new ForbiddenException(`You have reached your daily limit of ${limits.testsPerDay} test(s) for the ${plan || 'Free'} plan.`);
    }

    // Determine how many questions to request: prefer requestedQuestionCount when provided and valid
    const questionCount = (typeof requestedQuestionCount === 'number' && requestedQuestionCount > 0) ? requestedQuestionCount : limits.questionCount;
    if (limits.questionCount !== Infinity && questionCount > limits.questionCount) {
      throw new BadRequestException(`Your plan allows up to ${limits.questionCount} questions per test.`);
    }

    // Generate via AiService (now asks for tags)
    let questions: any;
    try {
      questions = await this.aiService.generateTest(topic, difficulty, questionCount);
    } catch (err) {
      // Bubble up AI errors as 503/500 with a clear message
      // eslint-disable-next-line no-console
      console.error('AiService.generateTest failed', err);
      throw new InternalServerErrorException('Failed to generate test from AI. Please try again later.');
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestException('AI returned no questions');
    }

    // persist as started attempt and increment usage (prefer transaction if manager.transaction is available)
    const title = `${topic} (${difficulty})`;
    const attemptObj = {
      userId: uid,
      title,
      questions,
      answers: {},
      score: 0,
      takenAt: null,
      status: 'started' as const,
    };

    // If the repository manager supports transactions (real DB), use it to atomically save attempt + increment usage.
    const repoManager = (this.usageRepo as any).manager;
    if (repoManager && typeof repoManager.transaction === 'function') {
      try {
        const saved = await repoManager.transaction(async (trx: any) => {
          const attemptRepo = trx.getRepository(TestAttempt);
          const usageRepo = trx.getRepository(AiUsage);

          const created = attemptRepo.create(attemptObj);
          const savedAttempt = await attemptRepo.save(created);

          // increment daily tests counter and save usage (use the trx usage record)
          let usageRecord = await usageRepo.findOne({ where: { userId: uid } });
          if (!usageRecord) {
            usageRecord = usageRepo.create({ userId: uid, testsTodayDate: today, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 });
          }
          if (usageRecord.testsTodayDate !== today) {
            usageRecord.testsTodayDate = today;
            usageRecord.testsTodayCount = 0;
          }
          usageRecord.testsTodayCount = (usageRecord.testsTodayCount || 0) + 1;
          usageRecord.testsTodayDate = today;
          await usageRepo.save(usageRecord);

          return savedAttempt;
        });
        return saved;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to save generated test attempt (transactional)', err);
        throw new InternalServerErrorException('Failed to save generated test attempt');
      }
    }

    // Fallback (e.g., in tests where manager.transaction is not mocked): non-transactional path
    try {
      const attempt = this.testRepo.create(attemptObj);
      const saved = await this.testRepo.save(attempt);
      // increment daily tests counter and save usage
      usage.testsTodayCount = (usage.testsTodayCount || 0) + 1;
      usage.testsTodayDate = today;
      await this.usageRepo.save(usage);
      return saved;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save generated test attempt', err);
      // Re-throw a safe message to client while keeping original log
      throw new InternalServerErrorException('Failed to save generated test attempt');
    }
  }

  // submitTest now supports soft-limit overflow for Tutor plan:
  // - Tutor users are allowed to exceed the explanationsPerMonth soft quota;
  // - When overflow occurs we still persist the explanationsCount and return a warning flag to the caller.
  async submitTest(userId: number, title: string, questions: any[], answers: any[], plan?: string) {
    const uid = typeof userId === 'string' ? Number(userId) : userId;
    if (!uid || Number.isNaN(uid)) throw new BadRequestException('Invalid user id');

    const limits = planLimits(plan);
    const isTutor = String(plan || '').toLowerCase() === 'tutor';

    // --- DEBUG: show plan & userId so we can validate what the controller passed ---
    // eslint-disable-next-line no-console
    console.debug('[TestService.submitTest] userId=', uid, 'plan=', plan, 'limits=', limits);

    // locate started attempt if available
    let attempt = await this.testRepo.findOne({ where: { userId: uid, title, status: 'started' } });

    // Count existing attempts (completed) to enforce attemptsPerTest
    const existingAttemptsCount = await this.testRepo.count({ where: { userId: uid, title, status: 'completed' } });
    if (limits.attemptsPerTest !== Infinity && existingAttemptsCount >= limits.attemptsPerTest) {
      throw new ForbiddenException(`You have reached the maximum attempts (${limits.attemptsPerTest}) for this test under your plan.`);
    }

    // get usage record for explanations
    let usage = await this.usageRepo.findOne({ where: { userId: uid } });
    if (!usage) {
      usage = this.usageRepo.create({ userId: uid, testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (usage.explanationsMonth !== currentMonth) {
      usage.explanationsMonth = currentMonth;
      usage.explanationsCount = 0;
    }

    const prevExplanationsCount = usage.explanationsCount || 0;
    const explanationsLimit = limits.explanationsPerMonth === Infinity ? Infinity : (limits.explanationsPerMonth as number);
    const explanationsRemaining = explanationsLimit === Infinity ? Infinity : Math.max(0, explanationsLimit - prevExplanationsCount);

    // --- DEBUG: show usage counts and limits before processing ---
    // eslint-disable-next-line no-console
    console.debug('[TestService.submitTest] prevExplanationsCount=', prevExplanationsCount, 'explanationsLimit=', explanationsLimit, 'explanationsRemaining=', explanationsRemaining, 'isTutor=', isTutor);

    let score = 0;
    const detailedQuestions = [];
    let explanationsUsedThisSubmission = 0;

    for (const q of questions) {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) score++;
      let explanation = null;

      // Allow Tutor users to exceed soft-limit. For other plans, only allow while explanationsRemaining > 0.
      const shouldAttemptExplanation = isTutor ? true : (explanationsUsedThisSubmission < explanationsRemaining);

      // --- DEBUG: per-question decision ---
      // eslint-disable-next-line no-console
      console.debug('[TestService.submitTest] question=', q.id ?? q.question, 'userAnswer=', userAnswer, 'isCorrect=', isCorrect, 'shouldAttemptExplanation=', shouldAttemptExplanation, 'explanationsUsedSoFar=', explanationsUsedThisSubmission);

      if (shouldAttemptExplanation) {
        try {
          explanation = await this.aiService.explainAnswer(q.question, userAnswer, q.correctAnswer);
          explanationsUsedThisSubmission++;
          // eslint-disable-next-line no-console
          console.debug('[TestService.submitTest] explanation obtained for question=', q.id ?? '(unknown)');
        } catch (ex) {
          explanation = 'Explanation unavailable at the moment.';
          // eslint-disable-next-line no-console
          console.warn('[TestService.submitTest] aiService.explainAnswer failed for question=', q.id ?? '(unknown)', ex);
        }
      } else {
        explanation = 'AI explanation limit reached for your plan.';
        // eslint-disable-next-line no-console
        console.debug('[TestService.submitTest] skipped explanation due to limit for question=', q.id ?? '(unknown)');
      }

      detailedQuestions.push({
        ...q,
        userAnswer,
        isCorrect,
        explanation,
      });
    }

    if (attempt) {
      attempt.questions = detailedQuestions;
      attempt.answers = answers;
      attempt.score = score;
      attempt.takenAt = new Date();
      attempt.status = 'completed';
    } else {
      attempt = this.testRepo.create({
        userId: uid,
        title,
        questions: detailedQuestions,
        answers,
        score,
        takenAt: new Date(),
        status: 'completed',
      });
    }

    try {
      const saved = await this.testRepo.save(attempt);

      // persist explanations usage (we allow overflow for Tutor)
      if (explanationsUsedThisSubmission > 0) {
        usage.explanationsCount = (usage.explanationsCount || 0) + explanationsUsedThisSubmission;
        usage.explanationsMonth = currentMonth;
        await this.usageRepo.save(usage);
      }

      // compute soft-limit overflow warning for Tutor
      let warning: string | undefined;
      if (isTutor && explanationsLimit !== Infinity) {
        if ((prevExplanationsCount + explanationsUsedThisSubmission) > explanationsLimit) {
          warning = 'soft limit exceeded';
        }
      }

      // --- DEBUG: summary of explanations used ---
      // eslint-disable-next-line no-console
      console.debug('[TestService.submitTest] explanationsUsedThisSubmission=', explanationsUsedThisSubmission, 'prevExplanationsCount=', prevExplanationsCount, 'finalExplanationsCount=', usage.explanationsCount);

      // New return shape: { attempt: saved, warning?: 'soft limit exceeded' }
      return { attempt: saved, warning };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save submitted test attempt', err);
      throw new InternalServerErrorException('Failed to save test attempt');
    }
  }

  async reviewTest(id: number) {
    return this.testRepo.findOne({ where: { id } });
  }
}