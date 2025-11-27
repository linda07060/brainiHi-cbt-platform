import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
import { AdminAuthGuard } from '../admin/admin-auth.guard';

/**
 * Admin-only preview endpoint for testing prompt templates.
 * Non-persistent: does not write anything to DB or ai_logs.
 */
@Controller('admin/prompts')
@UseGuards(AdminAuthGuard)
export class PromptsPreviewController {
  constructor(private readonly config: ConfigService) {}

  /**
   * POST /admin/prompts/preview
   * Body: { prompt: string, placeholders?: Record<string,string>, model?: string, temperature?: number, max_tokens?: number }
   * Returns raw model content (string or object depending on model).
   */
  @Post('preview')
  async preview(@Body() body: any) {
    const promptTemplate = body?.prompt;
    if (!promptTemplate || typeof promptTemplate !== 'string') {
      throw new BadRequestException('Missing prompt body');
    }

    // Simple placeholder substitution ({{key}}).
    const placeholders = body?.placeholders || {};
    let finalPrompt = promptTemplate;
    for (const [k, v] of Object.entries(placeholders)) {
      const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
      finalPrompt = finalPrompt.replace(re, String(v));
    }

    // Model options (safe defaults)
    const model = body?.model || this.config.get<string>('OPENAI_MODEL') || this.config.get<string>('OPENAI_EMBEDDING_MODEL') || 'gpt-4o';
    const temperature = typeof body?.temperature === 'number' ? body.temperature : 0.2;
    const max_tokens = typeof body?.max_tokens === 'number' ? body.max_tokens : 800;

    const OPENAI_API_KEY = this.config.get<string>('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return { error: 'OpenAI API Key not configured on server' };
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [{ role: 'user', content: finalPrompt }],
          temperature,
          max_tokens,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        },
      );

      // Return the raw text / object so UI can display it
      const content = response?.data?.choices?.[0]?.message?.content ?? response?.data;
      return { prompt: finalPrompt, model, content };
    } catch (err: any) {
      // Return non-sensitive error details for admin debugging
      const data = err?.response?.data ?? err?.message ?? String(err);
      return { prompt: finalPrompt, error: data };
    }
  }
}