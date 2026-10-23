import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { sessions, players } from '../../../lib/db/schema';
import { authed } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

/** Cross-week League Table: scores summed per team name (case-insensitive) and per week tag. Week 0 = untagged. */
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rows = await db.select({
    name: sql<string>`min(${players.name})`, week: sessions.week, score: sql<number>`sum(${players.score})`.mapWith(Number),
  }).from(players).innerJoin(sessions, eq(players.sessionId, sessions.id)).groupBy(sql`lower(${players.name})`, sessions.week);
  const teams = new Map<string, { name: string; total: number; weeks: Record<number, number> }>();
  const weeks = new Set<number>();
  for (const r of rows) {
    const k = r.name.toLowerCase(), w = r.week ?? 0;
    const t = teams.get(k) ?? { name: r.name, total: 0, weeks: {} };
    t.total += r.score; t.weeks[w] = (t.weeks[w] ?? 0) + r.score; weeks.add(w); teams.set(k, t);
  }
  return NextResponse.json({ weeks: [...weeks].sort((a, b) => a - b), teams: [...teams.values()].sort((a, b) => b.total - a.total) });
}
