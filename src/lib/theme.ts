import type { Quiz } from './quizSchema';

export const SKINS = ['science', 'space', 'patterns', 'history', 'nature', 'general'] as const;
export type Skin = (typeof SKINS)[number];

const KEYWORDS: Record<Exclude<Skin, 'general'>, string[]> = {
  science: ['science', 'physics', 'chemistry', 'biology', 'atom', 'cell', 'lab', 'experiment', 'molecule', 'energy'],
  space: ['space', 'planet', 'galaxy', 'orbit', 'nasa', 'isro', 'astronomy', 'star', 'moon', 'rocket', 'cosmos'],
  patterns: ['pattern', 'sequence', 'logic', 'puzzle', 'series', 'shape', 'riddle', 'reasoning', 'aptitude'],
  history: ['history', 'ancient', 'war', 'empire', 'dynasty', 'king', 'revolution', 'medieval', 'independence'],
  nature: ['nature', 'animal', 'plant', 'forest', 'ocean', 'wildlife', 'environment', 'climate', 'bird'],
};

/** Explicit theme wins; otherwise count keyword hits in title/topic/tags/question text. Offline, free. */
export function detectTheme(quiz: Quiz): Skin {
  if (quiz.theme && (SKINS as readonly string[]).includes(quiz.theme)) return quiz.theme as Skin;
  const hay = [quiz.title, quiz.topic ?? '', ...quiz.tags].join(' ').toLowerCase();
  const hasVisual = quiz.questions.some((q) => q.visual);
  let best: Skin = hasVisual ? 'patterns' : 'general';
  let bestScore = 0;
  for (const [skin, words] of Object.entries(KEYWORDS)) {
    const score = words.filter((w) => hay.includes(w)).length;
    if (score > bestScore) { best = skin as Skin; bestScore = score; }
  }
  return best;
}
