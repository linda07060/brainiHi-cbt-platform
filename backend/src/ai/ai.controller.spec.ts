import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

/**
 * TS-safe unit tests that do not import '@jest/globals' so they won't fail
 * in editors that lack that module. At runtime, Jest provides the globals.
 */
declare const describe: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const it: any;
declare const expect: any;
declare const jest: any;

describe('AiController', () => {
  let controller: AiController;
  let aiService: { generateTest: any };

  beforeEach(async () => {
    aiService = {
      generateTest: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: aiService }],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('forwards numeric questionCount to AiService.generateTest', async () => {
    const body = { topic: 'Algebra', difficulty: 'easy', questionCount: 8 };
    await controller.generate({ user: { sub: 1 } }, body);
    expect(aiService.generateTest).toHaveBeenCalledTimes(1);
    expect(aiService.generateTest).toHaveBeenCalledWith('Algebra', 'easy', 8);
  });

  it('parses and forwards question_count (string) to AiService.generateTest', async () => {
    const body = { topic: 'Geometry', difficulty: 'intermediate', question_count: '6' };
    await controller.generate({ user: { sub: 1 } }, body);
    expect(aiService.generateTest).toHaveBeenCalledTimes(1);
    expect(aiService.generateTest).toHaveBeenCalledWith('Geometry', 'intermediate', 6);
  });

  it('parses and forwards count (string) to AiService.generateTest', async () => {
    const body = { topic: 'Calculus', difficulty: 'advanced', count: '7' };
    await controller.generate({ user: { sub: 1 } }, body);
    expect(aiService.generateTest).toHaveBeenCalledTimes(1);
    expect(aiService.generateTest).toHaveBeenCalledWith('Calculus', 'advanced', 7);
  });

  it('calls AiService.generateTest without a count when none is provided', async () => {
    const body = { topic: 'Statistics', difficulty: 'beginner' };
    await controller.generate({ user: { sub: 1 } }, body);
    expect(aiService.generateTest).toHaveBeenCalledTimes(1);
    // Ensure it's called with only topic and difficulty (no numeric third arg)
    expect(aiService.generateTest).toHaveBeenCalledWith('Statistics', 'beginner');
  });
});