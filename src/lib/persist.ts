import { db } from './db';
import { quizzes, sessions, players, answers } from './db/schema';
import type { Room } from './engine';
import { detectTheme } from './theme';

/** Writes a finished game to Neon: quiz, session, final ranks, and every answer. */
export async function persist(room: Room) {
  const [quiz] = await db.insert(quizzes).values({ title: room.quiz.title, theme: detectTheme(room.quiz), data: room.quiz }).returning({ id: quizzes.id });
  const [s] = await db.insert(sessions).values({
    code: room.code, quizId: quiz.id, ruleset: room.ruleset, week: room.week ?? null,
    startedAt: new Date(room.createdAt), endedAt: new Date(),
  }).returning({ id: sessions.id });
  const ranked = [...room.players.values()].sort((a, b) => b.score - a.score);
  const ids = new Map<string, string>();
  for (const [i, p] of ranked.entries()) {
    const [r] = await db.insert(players).values({ sessionId: s.id, name: p.name, score: p.score, rank: i + 1 }).returning({ id: players.id });
    ids.set(p.id, r.id);
  }
  if (room.log.length)
    await db.insert(answers).values(room.log.map((l) => ({ sessionId: s.id, playerId: ids.get(l.pid)!, qIndex: l.qi, choice: l.choice, correct: l.correct, points: l.points, ms: l.ms })));
}
