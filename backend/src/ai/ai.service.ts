import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
import { AiLoggerService } from './ai-logger.service';

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly aiLogger: AiLoggerService, // <-- injected logger
  ) {}

  /**
   * Generate a test using OpenAI.
   * - topic: subject/topic string
   * - difficulty: 'easy' | 'medium' | 'hard' (string)
   * - questionCount: optional number of questions to request (default: 5)
   *
   * Returns parsed array of questions.
   */
  async generateTest(topic: string, difficulty: string, questionCount = 5) {
    const OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set!');
      // Log the failed attempt as an ai log (non-sensitive)
      try {
        await this.aiLogger.log({
          userId: null,
          prompt: `Generate ${questionCount} ${difficulty} questions for "${topic}"`,
          params: { topic, difficulty, questionCount },
          model: null,
          response: null,
          success: false,
          error: 'OpenAI API Key missing',
        });
      } catch {}
      throw new InternalServerErrorException('OpenAI API Key missing');
    }

    const prompt = `
Generate a ${difficulty}-level test on "${topic}" with ${questionCount} multiple-choice questions.
For each question, provide the following fields in a JSON array (no markdown, no code fences):
- id (number or string)
- question (string)
- options (array of strings, at least 2)
- correctAnswer (either the correct option string OR the index of the correct option (0-based))

Return ONLY valid JSON: an array of question objects, e.g.
[
  {
    "id": 1,
    "question": "What is 2+2?",
    "options": ["1", "2", "4", "5"],
    "correctAnswer": "4"
  }
]
Make the questions clear and self-contained.
    `;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 3000,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          // Remove rejectUnauthorized:false in production if possible
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        },
      );

      // Support different response shapes (choices[].message.content vs choices[].text)
      let content =
        response?.data?.choices?.[0]?.message?.content ??
        response?.data?.choices?.[0]?.text ??
        '';

      // Strip code fences if present
      content = content.replace(/^\s*```(?:json)?/i, '').replace(/```$/, '').trim();

      // Try strict JSON parse first, then fallback to substring extraction
      try {
        const parsed = JSON.parse(content);
        this._validateQuestions(parsed);

        // Persist a success ai log
        try {
          await this.aiLogger.log({
            userId: null,
            prompt,
            params: { topic, difficulty, questionCount },
            model: process.env.OPENAI_API_KEY ? 'openai' : null,
            response: parsed,
            success: true,
            error: null,
          });
        } catch (logErr) {
          // Do not fail the request if logging fails; just warn
          // eslint-disable-next-line no-console
          console.warn('[AiService.generateTest] failed to persist ai log', logErr);
        }

        return parsed;
      } catch (parseErr) {
        const start = content.indexOf('[');
        const end = content.lastIndexOf(']');
        if (start >= 0 && end > start) {
          try {
            const substring = content.substring(start, end + 1);
            const parsed = JSON.parse(substring);
            this._validateQuestions(parsed);

            try {
              await this.aiLogger.log({
                userId: null,
                prompt,
                params: { topic, difficulty, questionCount },
                model: process.env.OPENAI_API_KEY ? 'openai' : null,
                response: parsed,
                success: true,
                error: null,
              });
            } catch (logErr) {
              console.warn('[AiService.generateTest] failed to persist ai log', logErr);
            }

            return parsed;
          } catch {
            // Fall through to error
          }
        }

        // Persist parse failure to ai_logs for debugging
        try {
          await this.aiLogger.log({
            userId: null,
            prompt,
            params: { topic, difficulty, questionCount },
            model: process.env.OPENAI_API_KEY ? 'openai' : null,
            response: content,
            success: false,
            error: 'AI returned non-JSON response',
          });
        } catch {}

        console.error('AI response is not valid JSON:', content, parseErr);
        throw new InternalServerErrorException('AI did not return valid JSON. Please try again.');
      }
    } catch (err) {
      // Persist the OpenAI request failure so admins can inspect it
      try {
        await this.aiLogger.log({
          userId: null,
          prompt,
          params: { topic, difficulty, questionCount },
          model: process.env.OPENAI_API_KEY ? 'openai' : null,
          response: err?.response?.data ?? err?.message ?? String(err),
          success: false,
          error: 'OpenAI request failed',
        });
      } catch {}

      console.error('OpenAI request failed', err?.response?.data ?? err?.message ?? err);
      throw new InternalServerErrorException('Failed to call OpenAI for test generation');
    }
  }

  /**
   * Validate minimal structure of questions array returned by AI.
   * Throws InternalServerErrorException if invalid.
   */
  private _validateQuestions(questions: any) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new InternalServerErrorException('AI returned no questions');
    }
    for (const q of questions) {
      if (!q || typeof q !== 'object') {
        throw new InternalServerErrorException('Invalid question format returned by AI');
      }
      if (typeof q.question !== 'string' || q.question.trim().length === 0) {
        throw new InternalServerErrorException('Each question must include a question string');
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new InternalServerErrorException('Each question must include an options array with at least two choices');
      }
      if (typeof q.correctAnswer === 'undefined' || q.correctAnswer === null) {
        throw new InternalServerErrorException('Each question must include a correctAnswer value');
      }
      if (typeof q.correctAnswer === 'number') {
        if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
          throw new InternalServerErrorException('correctAnswer index out of range for a question');
        }
        // normalize numeric index to option text
        q.correctAnswer = q.options[q.correctAnswer];
      } else {
        const matched = q.options.some((opt) => String(opt).trim() === String(q.correctAnswer).trim());
        if (!matched) {
          throw new InternalServerErrorException('correctAnswer does not match any provided option for a question');
        }
      }
    }
  }

  async explainAnswer(question: string, userAnswer: string, correctAnswer: string) {
    const OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set!');
      try {
        await this.aiLogger.log({
          userId: null,
          prompt: `Explain answer for question: ${String(question).slice(0, 200)}`,
          params: { userAnswer, correctAnswer },
          model: null,
          response: null,
          success: false,
          error: 'OpenAI API Key missing',
        });
      } catch {}
      throw new InternalServerErrorException('OpenAI API Key missing');
    }

    const prompt = `
Question: ${question}
User's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

Give a step-by-step, student-friendly explanation for why the correct answer is right${
      userAnswer !== correctAnswer ? " and why the user's answer is incorrect" : ''
    }.
Respond in plain text, do NOT wrap in markdown or code fences.
    `;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 512,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        },
      );

      let content =
        response?.data?.choices?.[0]?.message?.content ??
        response?.data?.choices?.[0]?.text ??
        '';
      content = content.replace(/^\s*```(?:json)?/i, '').replace(/```$/, '').trim();

      // Persist explain logs (non-blocking on failures)
      try {
        await this.aiLogger.log({
          userId: null,
          prompt,
          params: { userAnswer, correctAnswer },
          model: process.env.OPENAI_API_KEY ? 'openai' : null,
          response: content,
          success: true,
          error: null,
        });
      } catch (logErr) {
        // do not fail the explanation if logging fails
        // eslint-disable-next-line no-console
        console.warn('[AiService.explainAnswer] failed to persist ai log', logErr);
      }

      return content;
    } catch (err) {
      console.error('OpenAI explainAnswer failed', err?.response?.data ?? err?.message ?? err);
      try {
        await this.aiLogger.log({
          userId: null,
          prompt,
          params: { userAnswer, correctAnswer },
          model: process.env.OPENAI_API_KEY ? 'openai' : null,
          response: err?.response?.data ?? err?.message ?? String(err),
          success: false,
          error: 'OpenAI explainError',
        });
      } catch {}
      throw new InternalServerErrorException('Failed to call OpenAI for explanation');
    }
  }
}