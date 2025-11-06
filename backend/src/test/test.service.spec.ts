/**
 * Copy-paste ready Jest spec for TestService
 *
 * This file intentionally avoids importing or referencing '@jest/globals' or '/// <reference types="jest" />'
 * because those can cause "Cannot find module '@jest/globals'" / "Cannot find type definition file for 'jest'"
 * errors in editors that don't have @types/jest configured.
 *
 * Instead we declare the Jest globals as `any` so the file is usable immediately. If you want strict typing,
 * please install @types/jest and remove the `declare` lines.
 */

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;
declare const jest: any;

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TestService } from './test.service';
import { TestAttempt } from './test.entity';
import { AiUsage } from '../ai/ai-usage.entity';
import { AiService } from '../ai/ai.service';

/* Lightweight runtime mock repo factory that uses jest.fn() for methods.
   Using plain objects with jest.fn() avoids TypeScript complaining about missing
   jest types in editors that don't have @types/jest configured. */
function createMockRepo(): Record<string, any> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };
}

describe('TestService', () => {
  let service: TestService;
  let testRepo: Record<string, any>;
  let usageRepo: Record<string, any>;
  let aiService: Record<string, any>;

  beforeEach(async () => {
    testRepo = createMockRepo();
    usageRepo = createMockRepo();
    aiService = {
      generateTest: jest.fn(),
      explainAnswer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestService,
        { provide: getRepositoryToken(TestAttempt), useValue: testRepo },
        { provide: getRepositoryToken(AiUsage), useValue: usageRepo },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();

    service = module.get<TestService>(TestService);
  });

  it('createFromAI: calls AiService.generateTest, saves a started TestAttempt and increments usage', async () => {
    const mockUserId = 123;
    const topic = 'Algebra';
    const difficulty = 'medium';
    const plan = 'Free';

    // AiService returns questions (with tags)
    const questions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctAnswer: 'A', tags: ['algebra'] },
    ];
    aiService.generateTest.mockResolvedValue(questions);

    // No existing usage record
    usageRepo.findOne.mockResolvedValue(undefined);
    const createdUsage = { userId: mockUserId, testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 };
    usageRepo.create.mockReturnValue(createdUsage);
    usageRepo.save.mockResolvedValue({ ...createdUsage, testsTodayCount: 1, testsTodayDate: new Date().toISOString().slice(0, 10) });

    // testRepo.create/save mocks
    const createdAttempt = {
      id: 555,
      userId: mockUserId,
      title: `${topic} (${difficulty})`,
      questions,
      answers: {},
      score: 0,
      takenAt: null,
      status: 'started',
    };
    testRepo.create.mockReturnValue(createdAttempt);
    testRepo.save.mockResolvedValue(createdAttempt);

    const result = await service.createFromAI(mockUserId, topic, difficulty, plan);

    // verify AiService called
    expect(aiService.generateTest).toHaveBeenCalledWith(topic, difficulty, expect.any(Number));

    // verify attempt saved and returned with status 'started'
    expect(testRepo.create).toHaveBeenCalled();
    expect(testRepo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.status).toBe('started');

    // verify usage increment persisted
    expect(usageRepo.save).toHaveBeenCalled();
  });

  it('submitTest: finds a started attempt, calls explainAnswer for explanations, marks completed and updates usage (returns attempt + optional warning)', async () => {
    const mockUserId = 123;
    const topic = 'Algebra';
    const difficulty = 'medium';
    const title = `${topic} (${difficulty})`;
    const plan = 'Pro';

    const startedAttempt = {
      id: 777,
      userId: mockUserId,
      title,
      questions: [],
      answers: {},
      score: 0,
      takenAt: null,
      status: 'started',
    };

    // When searching for started attempt, return startedAttempt
    testRepo.findOne.mockImplementation(async (opts?: any) => {
      if (opts && opts.where && opts.where.status === 'started') return startedAttempt;
      return null;
    });

    // No completed attempts previously
    testRepo.count.mockResolvedValue(0);

    // Prepare usage repo behavior
    const usageEntity = { userId: mockUserId, explanationsMonth: null, explanationsCount: 0, testsTodayDate: null, testsTodayCount: 0 };
    usageRepo.findOne.mockResolvedValue(usageEntity);
    usageRepo.create.mockReturnValue(usageEntity);
    usageRepo.save.mockResolvedValue({ ...usageEntity, explanationsCount: 1, explanationsMonth: new Date().toISOString().slice(0, 7) });

    // AiService.explainAnswer returns explanation text
    aiService.explainAnswer.mockResolvedValue('Because ...');

    // sample question and user answers (user answers incorrectly)
    const questions = [{ id: 1, question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' }];
    const answersObj: any = { 1: 'B' };

    // testRepo.save returns the saved attempt (echo back)
    testRepo.save.mockImplementation(async (t: any) => t);

    const res: any = await service.submitTest(mockUserId, title, questions, answersObj, plan);

    // res is { attempt, warning? }
    expect(res).toBeDefined();
    expect(res.attempt).toBeDefined();
    expect(res.attempt.status).toBe('completed');

    // validate explainAnswer called for explanation
    expect(aiService.explainAnswer).toHaveBeenCalledWith(expect.any(String), expect.anything(), expect.any(String));

    // validate saved attempt marked completed
    expect(res.attempt).toBeDefined();
    expect(res.attempt.status).toBe('completed');

    // validate usage updated
    expect(usageRepo.save).toHaveBeenCalled();
  });

  it('submitTest: tutor plan allows soft-limit overflow and returns a warning when exceeded', async () => {
    const mockUserId = 999;
    const title = 'Math (advanced)';
    const plan = 'Tutor';

    // started attempt present
    const startedAttempt = { id: 888, userId: mockUserId, title, questions: [], answers: {}, score: 0, takenAt: null, status: 'started' };
    testRepo.findOne.mockImplementation(async (opts?: any) => {
      if (opts && opts.where && opts.where.status === 'started') return startedAttempt;
      return null;
    });

    testRepo.count.mockResolvedValue(0);

    // usage indicates user is already at or just below the soft limit
    const usageEntity = { userId: mockUserId, explanationsMonth: new Date().toISOString().slice(0,7), explanationsCount: 1000, testsTodayDate: null, testsTodayCount: 0 };
    usageRepo.findOne.mockResolvedValue(usageEntity);
    usageRepo.create.mockReturnValue(usageEntity);
    usageRepo.save.mockResolvedValue({ ...usageEntity, explanationsCount: 1002, explanationsMonth: usageEntity.explanationsMonth });

    // AiService.explainAnswer resolves fine
    aiService.explainAnswer.mockResolvedValue('Tutor explanation text');

    const questions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
      { id: 2, question: 'Q2', options: ['A', 'B'], correctAnswer: 'B' },
    ];
    const answersObj: any = { 1: 'B', 2: 'A' };

    testRepo.save.mockImplementation(async (t: any) => ({ ...t, id: startedAttempt.id }));

    const res: any = await service.submitTest(mockUserId, title, questions, answersObj, plan);

    expect(res).toBeDefined();
    expect(res.attempt).toBeDefined();
    expect(res.attempt.status).toBe('completed');

    // As Tutor, we expect a warning flag when explanations push past the soft limit
    expect(res.warning).toBeDefined();
    expect(res.warning).toBe('soft limit exceeded');

    expect(usageRepo.save).toHaveBeenCalled();
  });
});