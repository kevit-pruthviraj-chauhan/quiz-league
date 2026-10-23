import { z } from 'zod';

export const QTYPES = ['mcq', 'tf', 'two_truths', 'false_stmt', 'rapid', 'fastest', 'steal', 'poll'] as const;

export const questionSchema = z.object({
  type: z.enum(QTYPES).default('mcq'),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct: z.array(z.number().int().min(0)).default([]),
  timeLimit: z.number().int().min(5).max(120).default(20),
  points: z.number().int().min(0).max(5000).default(1000),
  explanation: z.string().optional(),
  // Pattern questions: grid of emoji/symbols; use "?" for the blank cell
  visual: z.array(z.array(z.string())).optional(),
}).superRefine((q, ctx) => {
  if (q.type !== 'poll' && q.correct.length === 0)
    ctx.addIssue({ code: 'custom', message: 'correct is required (option indexes)', path: ['correct'] });
  if (q.correct.some((i) => i >= q.options.length))
    ctx.addIssue({ code: 'custom', message: 'correct index out of range', path: ['correct'] });
});

export const quizSchema = z.object({
  title: z.string().min(1),
  topic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  theme: z.string().optional(),
  themeTokens: z.object({
    colors: z.record(z.string()).optional(),
    fonts: z.array(z.string()).max(2).optional(),
    emoji: z.array(z.string()).max(8).optional(),
  }).optional(),
  ruleset: z.enum(['speed', 'fastest', 'classic', 'streak', 'lives']).optional(),
  questions: z.array(questionSchema).min(1).max(100),
});

export type Quiz = z.infer<typeof quizSchema>;
export type Question = z.infer<typeof questionSchema>;

/** Returns readable errors like "questions.2.correct: ..." for the import preview. */
export function parseQuiz(raw: unknown) {
  const r = quizSchema.safeParse(raw);
  return r.success
    ? { ok: true as const, quiz: r.data }
    : { ok: false as const, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
