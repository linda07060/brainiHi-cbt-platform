import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GeneratedQuestion } from './entities/generated-question.entity';
import { EmbeddingsService } from './embeddings.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DuplicateCheckerService {
  private readonly logger = new Logger(DuplicateCheckerService.name);
  private readonly enabledPgvector: boolean;

  constructor(
    @InjectRepository(GeneratedQuestion)
    private readonly qRepo: Repository<GeneratedQuestion>,
    private readonly embeddings: EmbeddingsService,
    private readonly config: ConfigService,
    private readonly ds: DataSource,
  ) {
    this.enabledPgvector = String(this.config.get('ENABLE_PGVECTOR') || '').toLowerCase() === 'true';
  }

  /**
   * Returns true if a similar question exists.
   * If pgvector is enabled and an embeddings column is present, use DB nearest neighbor search.
   * Otherwise use a conservative fingerprint-based fallback.
   */
  async isDuplicateByContent(text: string, choices: string[], topic?: string, threshold = 0.87): Promise<{ isDuplicate: boolean; reason?: string; matchId?: string | number; score?: number }> {
    try {
      // pgvector path: expect that generated_questions has an embeddings column named embedding (vector)
      if (this.enabledPgvector) {
        try {
          const emb = await this.embeddings.createEmbedding((text || '') + ' ' + (choices || []).join(' '));
          // Use raw SQL for pgvector cosine similarity (vector extension required)
          const sql = `
            SELECT question_id, 1 - (embedding <=> $1::vector) AS similarity
            FROM generated_questions
            WHERE topic = COALESCE($2, topic)
            ORDER BY embedding <=> $1::vector
            LIMIT 5;
          `;
          const params = [emb, topic ?? null];
          const rows = await this.ds.query(sql, params);
          if (rows && rows.length) {
            const best = rows[0];
            const score = Number(best.similarity ?? 0);
            if (score >= threshold) return { isDuplicate: true, reason: 'pgvector_match', matchId: best.question_id, score };
          }
          return { isDuplicate: false };
        } catch (err) {
          this.logger.warn('pgvector check failed, falling back: ' + String(err?.message ?? err));
          // fall through to fingerprint fallback
        }
      }

      // Fallback: conservative fingerprint heuristic
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
      const ntext = normalize(text);
      const candidates = await this.qRepo.find({ where: { topic: topic ?? undefined }, order: { created_at: 'DESC' }, take: 500 });
      for (const c of candidates) {
        const ct = normalize(c.question_text);
        if (ct === ntext) return { isDuplicate: true, reason: 'exact_text' , matchId: c.question_id, score: 1 };
        // compare choice sets
        const join = (arr: string[]) => arr.map(normalize).join('|');
        if (join(c.choices || []) === join(choices || [])) return { isDuplicate: true, reason: 'choices_match', matchId: c.question_id, score: 1 };
      }
      return { isDuplicate: false };
    } catch (err) {
      this.logger.warn('DuplicateChecker failure: ' + String(err?.message ?? err));
      return { isDuplicate: false };
    }
  }
}