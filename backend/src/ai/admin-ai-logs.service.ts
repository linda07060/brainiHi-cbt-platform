import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiLog } from './entities/ai-log.entity';
import { GeneratedQuestion } from './entities/generated-question.entity';
import { Response } from 'express';

@Injectable()
export class AiLogsAdminService {
  constructor(
    @InjectRepository(AiLog)
    private readonly logRepo: Repository<AiLog>,
    @InjectRepository(GeneratedQuestion)
    private readonly qRepo: Repository<GeneratedQuestion>,
  ) {}

  async list(filters: { userId?: number; model?: string; success?: boolean; page?: number; limit?: number }) {
    const qb = this.logRepo.createQueryBuilder('l').orderBy('l.createdAt', 'DESC');
    if (filters.userId) qb.andWhere('l.userId = :userId', { userId: filters.userId });
    if (filters.model) qb.andWhere('l.model = :model', { model: filters.model });
    if (typeof filters.success === 'boolean') qb.andWhere('l.success = :success', { success: filters.success });
    const page = filters.page ?? 1;
    const limit = Math.min(500, filters.limit ?? 50);
    qb.take(limit).skip((page - 1) * limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, totalPages: Math.ceil(total / limit) || 1 };
  }

  async detail(id: number) {
    const log = await this.logRepo.findOne({ where: { id } });
    if (!log) throw new NotFoundException('Log not found');
    let parsedQuestion: GeneratedQuestion | null = null;
    try {
      const resp = log.response;
      if (resp && resp.answer && resp.answer.question_id) {
        parsedQuestion = await this.qRepo.findOne({ where: { question_id: resp.answer.question_id } });
      } else if (resp && resp[0] && resp[0].id) {
        parsedQuestion = await this.qRepo.findOne({ where: { question_id: String(resp[0].id) } });
      }
    } catch {}
    return { log, parsedQuestion };
  }

  async exportOneAsCsv(id: number) {
    const { log } = await this.detail(id);
    const rows: string[] = [];
    const headers = ['question_id', 'question_text', 'choices', 'correct_answer', 'explanation', 'difficulty', 'topic', 'estimated_time_seconds'];
    rows.push(headers.join(','));
    try {
      const resp = log.response;
      const candidate = Array.isArray(resp) && resp.length ? resp[0] : (resp && resp.answer ? resp.answer : null);
      if (candidate) {
        const line = [
          candidate.question_id || candidate.id || '',
          (candidate.question || candidate.question_text || '').replace(/"/g, '""'),
          (candidate.choices || candidate.options || []).join(' | ').replace(/"/g, '""'),
          candidate.correct_answer || candidate.correctAnswer || '',
          (candidate.explanation || '').replace(/"/g, '""'),
          candidate.difficulty || '',
          candidate.topic || '',
          candidate.estimated_time_seconds || '',
        ];
        rows.push(line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
      }
    } catch {}
    return rows.join('\n');
  }

  /**
   * Stream CSV rows for many ai_logs. This implementation pages through the logs
   * and writes CSV rows to the provided Express response to avoid loading everything into memory.
   */
  async streamExport(filters: { userId?: number; model?: string; success?: boolean }, res: Response) {
    // Write header
    const headers = ['id', 'userId', 'model', 'success', 'error', 'prompt', 'params', 'response', 'createdAt'];
    res.write(headers.join(',') + '\n');

    // Page through results
    const pageSize = 1000;
    let page = 0;
    while (true) {
      page++;
      const qb = this.logRepo.createQueryBuilder('l').orderBy('l.createdAt', 'DESC').take(pageSize).skip((page - 1) * pageSize);
      if (filters.userId) qb.andWhere('l.userId = :userId', { userId: filters.userId });
      if (filters.model) qb.andWhere('l.model = :model', { model: filters.model });
      if (typeof filters.success === 'boolean') qb.andWhere('l.success = :success', { success: filters.success });

      const items = await qb.getMany();
      if (!items || items.length === 0) break;

      for (const l of items) {
        // safe CSV row building
        const safe = (v: any) => {
          if (v === null || typeof v === 'undefined') return '';
          const s = typeof v === 'string' ? v : JSON.stringify(v);
          return `"${s.replace(/"/g, '""')}"`;
        };
        const row = [
          l.id,
          l.userId ?? '',
          l.model ?? '',
          String(l.success),
          l.error ?? '',
          safe(l.prompt),
          safe(l.params),
          safe(l.response),
          l.createdAt?.toISOString() ?? '',
        ].join(',');
        res.write(row + '\n');
      }

      // Flush chunk
      await new Promise((resolve) => setImmediate(resolve));

      // If fewer than pageSize returned, we are done
      if (items.length < pageSize) break;
    }

    res.end();
  }
}