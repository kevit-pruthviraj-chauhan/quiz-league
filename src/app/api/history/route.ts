import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { sessions, quizzes, players } from '../../../lib/db/schema';
import { authed } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rows = await db.select({
    id: sessions.id, code: sessions.code, week: sessions.week, ruleset: sessions.ruleset, endedAt: sessions.endedAt,
    title: quizzes.title, theme: quizzes.theme, teams: sql<number>`count(${players.id})`.mapWith(Number),
  }).from(sessions).innerJoin(quizzes, eq(sessions.quizId, quizzes.id)).leftJoin(players, eq(players.sessionId, sessions.id))
    .groupBy(sessions.id, quizzes.id).orderBy(desc(sessions.endedAt)).limit(100);
  return NextResponse.json(rows);
}
