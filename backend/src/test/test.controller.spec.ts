import { Test, TestingModule } from '@nestjs/testing';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { UserService } from '../user/user.service';

/**
 * Use ambient Jest globals so this file compiles even if the editor/TS server
 * doesn't have @jest/globals configured. At runtime Jest provides the real impl.
 */
declare const describe: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const it: any;
declare const expect: any;
declare const jest: any;

describe('TestController', () => {
  let controller: TestController;
  let mockTestService: {
    submitTest: any;
  };
  let mockUserService: Partial<UserService>;

  beforeEach(async () => {
    mockTestService = {
      submitTest: jest.fn(),
    };

    mockUserService = {
      // findById used by submit(); return a Tutor plan by default for this spec
      findById: jest.fn().mockResolvedValue({ id: 42, plan: 'Tutor' } as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        { provide: TestService, useValue: mockTestService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<TestController>(TestController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('maps service { attempt, warning } to top-level id/score/total/questions and forwards user plan to TestService', async () => {
    const userId = 42;
    const questions = [
      { id: 1, question: 'What is 2+2?', correctAnswer: '4', userAnswer: '4', isCorrect: true, explanation: 'Because 2+2=4' },
      { id: 2, question: 'What is 3+5?', correctAnswer: '8', userAnswer: '7', isCorrect: false, explanation: 'Correct is 8' },
    ];
    const attempt = {
      id: 999,
      userId,
      title: 'Algebra (medium)',
      questions,
      answers: { 1: '4', 2: '7' },
      score: 1,
      takenAt: new Date(),
      status: 'completed',
    };

    // Mock the TestService to return the { attempt, warning } shape the controller expects
    mockTestService.submitTest.mockResolvedValue({ attempt, warning: 'soft limit exceeded' });

    const body = {
      answers: attempt.answers,
      questions: attempt.questions,
      topic: 'Algebra',
      difficulty: 'medium',
    };

    // Call the controller method (bypasses guards since we call method directly)
    const res: any = await controller.submit({ user: { sub: userId } }, body);

    // Assert userService.findById was called to fetch the authoritative plan
    expect((mockUserService.findById as any)).toHaveBeenCalledWith(userId);

    // Assert service was called with the expected normalized title, payload and the Tutor plan
    expect(mockTestService.submitTest).toHaveBeenCalledTimes(1);
    expect(mockTestService.submitTest).toHaveBeenCalledWith(userId, `${body.topic} (${body.difficulty})`, body.questions, body.answers, 'Tutor');

    // Assert controller maps fields to top-level response
    expect(res).toBeDefined();
    expect(res.id).toBe(attempt.id);
    expect(res.score).toBe(attempt.score);
    expect(res.total).toBe(attempt.questions.length);
    expect(res.questions).toBe(attempt.questions);
    expect(res.warning).toBe('soft limit exceeded');
  });
});