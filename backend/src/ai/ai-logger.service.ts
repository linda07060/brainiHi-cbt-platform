import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiLog } from './entities/ai-log.entity';

@Injectable()
export class AiLoggerService {
  constructor(
    @InjectRepository(AiLog)
    private readonly logRepo: Repository<AiLog>,
  ) {}

  /**
   * Log an AI interaction. Non-blocking in callers if desired.
   */
  async log(entry: {
    userId?: number | null;
    prompt: string;
    params?: any;
    model?: string;
    response?: any;
    success?: boolean;
    error?: string | null;
  }) {
    const rec = this.logRepo.create({
      userId: entry.userId ?? null,
      prompt: entry.prompt,
      params: entry.params ?? null,
      model: entry.model ?? null,
      response: entry.response ?? null,
      success: entry.success ?? true,
      error: entry.error ?? null,
    });
    return this.logRepo.save(rec);
  }
}