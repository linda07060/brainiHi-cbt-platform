import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiTutorConversation } from './ai-tutor.entity';
import { TestAttempt } from '../test/test.entity';
import { AiUsage } from './ai-usage.entity';
import { planLimits } from '../plan/plan.constants';

type TutorMessage = { role: 'user' | 'assistant' | string; text?: string; content?: string; createdAt: string };

@Injectable()
export class AiTutorService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AiTutorConversation)
    private readonly convoRepo: Repository<AiTutorConversation>,
    @InjectRepository(TestAttempt)
    private readonly testRepo: Repository<TestAttempt>,
    @InjectRepository(AiUsage)
    private readonly usageRepo: Repository<AiUsage>,
  ) {}

  private getOpenAiKey() {
    const key = this.configService.get<string>('OPENAI_API_KEY');
    if (!key) throw new InternalServerErrorException('OpenAI API key not configured');
    return key;
  }

  // Create/append message and ask OpenAI for a reply. Stores both user message and assistant reply.
  async sendTutorMessage(userId: number, messageText: string, conversationId?: number) {
    let convo = conversationId
      ? await this.convoRepo.findOne({ where: { id: conversationId, userId } }) as AiTutorConversation
      : undefined as any;

    if (!convo) {
      convo = this.convoRepo.create({ userId, messages: [] });
    }

    // Append user's message (we persist as "text" for consistency)
    const userMsg: TutorMessage = { role: 'user', text: messageText, createdAt: new Date().toISOString() };
    convo.messages = convo.messages || [];
    convo.messages.push(userMsg as any);

    // Save before calling OpenAI (so we have conversation persisted)
    convo = await this.convoRepo.save(convo);

    // Build system instruction
    const system = {
      role: 'system',
      content: `You are a helpful personal tutor. Provide step-by-step explanations, suggest focused exercises, and track the learner's weak areas. Keep replies concise and actionable.`,
    };

    // include recent messages; conversation messages may use "text" or "content"
    const recent: Array<{ role: string; content: string }> = (convo.messages || [])
      .slice(-8)
      .map((m: any) => {
        const msg = m as TutorMessage;
        return { role: msg.role, content: (msg.text ?? msg.content ?? '').toString() };
      });

    // Build the payload for OpenAI (use recent content for context)
    const payload = {
      model: 'gpt-4o',
      messages: [
        system,
        // convert recent to the chat API shape
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.3,
      max_tokens: 800,
    };

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        payload,
        {
          headers: { Authorization: `Bearer ${this.getOpenAiKey()}`, 'Content-Type': 'application/json' },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        },
      );

      const reply =
        response?.data?.choices?.[0]?.message?.content ??
        response?.data?.choices?.[0]?.text ??
        'Sorry, I could not generate a reply.';

      const assistantMsg: TutorMessage = { role: 'assistant', text: String(reply).trim(), createdAt: new Date().toISOString() };
      convo.messages.push(assistantMsg as any);
      await this.convoRepo.save(convo);

      return { conversationId: convo.id, reply: assistantMsg.text };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Tutor chat OpenAI error', err?.response?.data ?? err?.message ?? err);
      throw new InternalServerErrorException('Failed to generate tutor reply');
    }
  }

  // Return conversation messages for a conversationId (or recent list)
  async getConversation(userId: number, conversationId?: number) {
    if (conversationId) {
      return this.convoRepo.findOne({ where: { id: conversationId, userId } });
    }
    // If no conversationId, return recent conversations for this user
    return this.convoRepo.find({ where: { userId }, order: { updatedAt: 'DESC' }, take: 5 });
  }

  // Basic analytics: compute weak areas from user's test attempts.
  async computeWeakAreas(userId: number) {
    const attempts = await this.testRepo.find({ where: { userId }, order: { takenAt: 'DESC' }, take: 50 });

    const counts: Record<string, number> = {};
    for (const a of attempts) {
      const qs = Array.isArray(a.questions) ? a.questions : [];
      for (const q of qs) {
        const isCorrect = !!q.isCorrect;
        if (!isCorrect) {
          if (q.tags && Array.isArray(q.tags) && q.tags.length) {
            for (const t of q.tags) counts[t] = (counts[t] || 0) + 1;
          } else if (q.topic) {
            counts[q.topic] = (counts[q.topic] || 0) + 1;
          } else {
            const key = String(q.question || '').split(/\s+/).slice(0, 6).join(' ').toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      }
    }

    const weakAreas = Object.keys(counts)
      .map((k) => ({ area: k, misses: counts[k] }))
      .sort((a, b) => b.misses - a.misses)
      .slice(0, 8);

    const recommendations = weakAreas.map((w) => ({
      area: w.area,
      misses: w.misses,
      recommendedPractice: Math.min(20, Math.max(5, w.misses * 2)),
    }));

    return { weakAreas: recommendations, attemptsCount: attempts.length };
  }

  // Return usage + plan limits for frontend display.
  async getUsageForDisplay(userId: number, plan: string | undefined) {
    // normalize and log the incoming plan string (helps debug why Pro users see Free)
    const rawPlan = String(plan || 'Free').trim();
    const normalizedLower = rawPlan.toLowerCase();
    const normalizedPlan = normalizedLower === 'pro' ? 'Pro' : normalizedLower === 'tutor' ? 'Tutor' : 'Free';
    // eslint-disable-next-line no-console
    console.debug(`[AiTutorService] getUsageForDisplay userId=${userId} planRaw="${rawPlan}" normalized="${normalizedPlan}"`);

    const limits = planLimits(normalizedPlan);

    let usage = await this.usageRepo.findOne({ where: { userId } });
    if (!usage) {
      usage = this.usageRepo.create({ userId, testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const month = new Date().toISOString().slice(0, 7);

    let testsTodayCount = usage.testsTodayCount || 0;
    if (usage.testsTodayDate !== today) testsTodayCount = 0;

    let explanationsCount = usage.explanationsCount || 0;
    if (usage.explanationsMonth !== month) explanationsCount = 0;

    const explanationsRemaining = limits.explanationsPerMonth === Infinity ? Infinity : Math.max(0, (limits.explanationsPerMonth as number) - explanationsCount);
    const testsRemaining = limits.testsPerDay === Infinity ? Infinity : Math.max(0, (limits.testsPerDay as number) - testsTodayCount);

    return {
      plan: normalizedPlan,
      limits: {
        testsPerDay: limits.testsPerDay,
        questionCount: limits.questionCount,
        attemptsPerTest: limits.attemptsPerTest,
        explanationsPerMonth: limits.explanationsPerMonth,
      },
      usage: {
        testsTodayDate: usage.testsTodayDate,
        testsTodayCount,
        explanationsMonth: usage.explanationsMonth || month,
        explanationsCount,
      },
      remaining: {
        testsRemaining,
        explanationsRemaining,
      },
    };
  }
}