import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  constructor(private readonly config: ConfigService) {}

  private getKey(): string {
    const k = this.config.get<string>('OPENAI_API_KEY');
    if (!k) throw new InternalServerErrorException('OPENAI_API_KEY not configured');
    return k;
  }

  /**
   * Request embeddings from OpenAI.
   * Uses `text-embedding-3-small` by default; change with OPENAI_EMBEDDING_MODEL.
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.config.get<string>('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';
      const res = await axios.post(
        'https://api.openai.com/v1/embeddings',
        { model, input: text },
        { headers: { Authorization: `Bearer ${this.getKey()}`, 'Content-Type': 'application/json' } },
      );
      const emb = res?.data?.data?.[0]?.embedding;
      if (!emb || !Array.isArray(emb)) throw new Error('No embedding in response');
      return emb;
    } catch (err) {
      this.logger.warn('Embedding creation failed: ' + String(err?.message ?? err));
      throw new InternalServerErrorException('Failed to create embedding');
    }
  }

  /**
   * Cosine similarity helper (client-side fallback)
   */
  static cosine(a: number[], b: number[]) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1e-12);
  }
}