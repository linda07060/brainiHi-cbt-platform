import { z } from 'zod';

export const QuestionSchema = z.object({
  question_id: z.string(),
  question_text: z.string(),
  // choices stored as jsonb, modeled as an array of strings here — change if your choices shape differs
  choices: z.array(z.string()),
  correct_answer: z.string(),
  explanation: z.string().nullable().optional(),
  difficulty: z.string(),
  topic: z.string(),
  estimated_time_seconds: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(), // <-- fixed: key + value schema
  // embedding stored as jsonb array of numbers
  embedding: z.array(z.number()).nullable().optional(),
  created_at: z.string().optional(),
});

export type Question = z.infer<typeof QuestionSchema>;