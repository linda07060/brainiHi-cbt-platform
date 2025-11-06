import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AiService } from './ai.service';
import { AiLoggerService } from './ai-logger.service';
import { GeneratedQuestion } from './entities/generated-question.entity';
import { QuestionSchema, Question } from './question.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DuplicateCheckerService } from './duplicate-checker.service';
import { EmbeddingsService } from './embeddings.service';

@Injectable()
export class GenerateV2Service {
  private readonly logger = new Logger(GenerateV2Service.name);
  private prompts: Record<string, string> = {};
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
    private readonly aiLogger: AiLoggerService,
    @InjectRepository(GeneratedQuestion)
    private readonly generatedRepo: Repository<GeneratedQuestion>,
    private readonly duplicateChecker: DuplicateCheckerService,
    private readonly embeddings: EmbeddingsService,
  ) {
    this.loadPrompts();
  }

  private loadPrompts() {
    const fallback = path.resolve(process.cwd(), 'frontend', 'src', 'config', 'ai-prompts.json');
    const p = this.configService.get<string>('PROMPTS_PATH') || fallback;
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        this.prompts = JSON.parse(raw);
      } else {
        this.prompts = {};
      }
    } catch (err) {
      this.logger.warn('Failed to load prompts from path: ' + p + ' error: ' + String(err));
      this.prompts = {};
    }
  }

  async generateSingle(topic: string, difficulty: string, userId?: number | null): Promise<Question> {
    const promptTemplate = this.prompts['default_question_prompt'] || this.prompts['default_prompt'] || '';
    if (!promptTemplate) {
      throw new InternalServerErrorException('No prompt template configured for generation');
    }

    let attempt = 0;
    let lastError: any = null;

    while (attempt < this.MAX_RETRIES) {
      attempt++;
      try {
        const arr = await this.aiService.generateTest(topic, difficulty, 1);
        const candidate = Array.isArray(arr) && arr.length ? arr[0] : null;
        if (!candidate) throw new Error('Model returned empty result');

        const normalized: any = {
          question_id: candidate.id ? String(candidate.id) : (crypto.randomUUID ? crypto.randomUUID() : crypto.createHash('sha1').update(String(Date.now())).digest('hex')),
          question_text: candidate.question || candidate.question_text || candidate.prompt || '',
          choices: candidate.options || candidate.choices || [],
          correct_answer: (typeof candidate.correctAnswer !== 'undefined' ? candidate.correctAnswer : candidate.correct_answer) ?? '',
          explanation: candidate.explanation ?? '',
          difficulty: difficulty,
          topic: topic,
          estimated_time_seconds: candidate.estimated_time_seconds ? Number(candidate.estimated_time_seconds) : candidate.time ? Number(candidate.time) : 60,
          metadata: { rawCandidate: candidate },
        };

        if (typeof normalized.correct_answer === 'number') {
          normalized.correct_answer = normalized.choices[normalized.correct_answer] ?? normalized.correct_answer;
        }

        const parsed = QuestionSchema.parse(normalized) as Question;

        // Duplicate check via injected service
        const dup = await this.duplicateChecker.isDuplicateByContent(parsed.question_text, parsed.choices, parsed.topic);
        if (dup.isDuplicate) {
          await this.aiLogger.log({ userId: userId ?? null, prompt: promptTemplate, params: { topic, difficulty, attempt }, model: process.env.OPENAI_API_KEY ? 'openai' : null, response: candidate, success: false, error: `duplicate:${dup.reason}` });
          lastError = new Error(`duplicate:${dup.reason}`);
          // try again
          continue;
        }

        // Persist
        const entity = this.generatedRepo.create({
          question_id: parsed.question_id,
          question_text: parsed.question_text,
          choices: parsed.choices,
          correct_answer: parsed.correct_answer,
          explanation: parsed.explanation,
          difficulty: String(parsed.difficulty),
          topic: parsed.topic,
          estimated_time_seconds: parsed.estimated_time_seconds,
          metadata: parsed.metadata ?? null,
        });
        await this.generatedRepo.save(entity);

        // Optionally create and store embedding if pgvector enabled (duplicate checker may have done it)
        try {
          if (String(this.configService.get('ENABLE_PGVECTOR') || '').toLowerCase() === 'true') {
            const embText = parsed.question_text + ' ' + (parsed.choices || []).join(' ');
            const emb = await this.embeddings.createEmbedding(embText);
            // store embedding via raw SQL (so migration must include embedding column)
            await this.generatedRepo.manager.query(
              `UPDATE generated_questions SET embedding = $1 WHERE question_id = $2`,
              [emb, parsed.question_id],
            );
          }
        } catch (err) {
          // non-fatal
          this.logger.warn('Failed to persist embedding: ' + String(err?.message ?? err));
        }

        await this.aiLogger.log({ userId: userId ?? null, prompt: promptTemplate, params: { topic, difficulty }, model: process.env.OPENAI_API_KEY ? 'openai' : null, response: candidate, success: true, error: null });
        return parsed;
      } catch (err) {
        lastError = err;
        try {
          await this.aiLogger.log({ userId: userId ?? null, prompt: promptTemplate, params: { topic, difficulty, attempt }, model: process.env.OPENAI_API_KEY ? 'openai' : null, response: null, success: false, error: String(err) });
        } catch {}
        await new Promise((res) => setTimeout(res, 300 * attempt));
        continue;
      }
    }

    throw new InternalServerErrorException({ error: 'generation_failed', detail: lastError?.message ?? String(lastError) });
  }
}