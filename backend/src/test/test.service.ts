import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestAttempt } from './test.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(TestAttempt)
    private readonly testRepo: Repository<TestAttempt>,
    private readonly aiService: AiService,
  ) {}

  async listUserTests(userId: number) {
    return this.testRepo.find({ where: { userId }, order: { takenAt: 'DESC' } });
  }

  async submitTest(userId: number, title: string, questions: any, answers: any) {
    let score = 0;
    const detailedQuestions = await Promise.all(
      questions.map(async (q, idx) => {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.correctAnswer;
        if (isCorrect) score++;
        const explanation = await this.aiService.explainAnswer(q.question, userAnswer, q.correctAnswer);
        return {
          ...q,
          userAnswer,
          isCorrect,
          explanation,
        };
      }),
    );
    const test = this.testRepo.create({ userId, title, questions: detailedQuestions, answers, score, takenAt: new Date() });
    await this.testRepo.save(test);
    return test;
  }

  async reviewTest(id: number) {
    return this.testRepo.findOne({ where: { id } });
  }
}