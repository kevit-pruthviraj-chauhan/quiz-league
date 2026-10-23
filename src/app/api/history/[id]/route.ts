import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../../../lib/db';
import { sessions, quizzes, players, answers } from '../../../../lib/db/schema';
import { authed } from '../../../../lib/auth';
import { line } from '../../../../lib/csv';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f-]{36}$/i;

/** Past-session CSV. Answers CSV only has rows for questions a team actually answered (blanks aren't stored). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const kind = new URL(req.url).searchParams.get('kind') === 'answers' ? 'answers' : 'results';
  if (!UUID.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  let rows: string[];
  if (kind === 'results') {
    const ps = await db.select().from(players).where(eq(players.sessionId, id)).orderBy(asc(players.rank));
    rows = [line(['Rank', 'Team', 'Score']), ...(ps as any[]).map((p: any) => line([p.rank, p.name, p.score]))];
  } else {
    const [s] = await db.select({ data: quizzes.data }).from(sessions).innerJoin(quizzes, eq(sessions.quizId, quizzes.id)).where(eq(sessions.id, id));
    if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const qs = (s.data as any).questions as { text: string; options: string[] }[];
    const as = await db.select({ name: players.name, rank: players.rank, a: answers }).from(answers).innerJoin(players, eq(answers.playerId, players.id))
      .where(eq(answers.sessionId, id)).orderBy(asc(players.rank), asc(answers.qIndex));
    rows = [line(['Team', 'Question #', 'Question', 'Answer', 'Correct', 'Points', 'Time (s)']),
      ...(as as any[]).map(({ name, a }: any) => { const q = qs[a.qIndex]; return line([name, a.qIndex + 1, q?.text, (a.choice as number[]).map((i) => q?.options[i]).join(' | '), a.correct ? 'yes' : 'no', a.points, (a.ms / 1000).toFixed(2)]); })];
  }
  return new NextResponse('\ufeff' + rows.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
}
