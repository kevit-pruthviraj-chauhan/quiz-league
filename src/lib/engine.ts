import { randomUUID } from 'crypto';
import type { Quiz, Question } from './quizSchema';
import { detectTheme } from './theme';

export const MAX_PLAYERS = 20;
export type Ruleset = 'classic' | 'speed' | 'streak' | 'lives';
export type Phase = 'lobby' | 'question' | 'reveal' | 'final';

export interface Player { id: string; name: string; token: string; score: number; streak: number; lives: number; socketId?: string; connected: boolean }
export interface LogRow { pid: string; qi: number; choice: number[]; correct: boolean; points: number; ms: number }
export interface Room {
  code: string; quiz: Quiz; ruleset: Ruleset; week?: number; phase: Phase; qi: number;
  startedAt: number; endsAt: number; stealAt: number; owner?: string; pausedLeft?: number; createdAt: number; hostSocket?: string; timer?: NodeJS.Timeout;
  players: Map<string, Player>; answers: Map<string, { choice: number[]; ms: number }>;
  last: Map<string, { correct: boolean; points: number }>; log: LogRow[];
}

export const rooms = new Map<string, Room>();
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRoom(quiz: Quiz, ruleset?: Ruleset, week?: number): Room {
  let code = '';
  do code = Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  while (rooms.has(code));
  const room: Room = {
    code, quiz, ruleset: ruleset ?? quiz.ruleset ?? 'speed', week, phase: 'lobby', qi: -1, startedAt: 0, endsAt: 0, stealAt: 0,
    createdAt: Date.now(), players: new Map(), answers: new Map(), last: new Map(), log: [],
  };
  rooms.set(code, room);
  return room;
}

export function join(room: Room, rawName: string, token: string): Player {
  const existing = [...room.players.values()].find((p) => p.token === token);
  if (existing) return existing; // reconnect
  const name = rawName.trim().slice(0, 24);
  if (!name) throw new Error('Enter a team name');
  if (room.phase !== 'lobby') throw new Error('This game has already started');
  if (room.players.size >= MAX_PLAYERS) throw new Error(`Room is full (${MAX_PLAYERS} max)`);
  if ([...room.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new Error('That name is taken');
  const p: Player = { id: randomUUID(), name, token, score: 0, streak: 0, lives: 3, connected: true };
  room.players.set(p.id, p);
  return p;
}

const alive = (room: Room, p: Player) => room.ruleset !== 'lives' || p.lives > 0;
const activePlayers = (room: Room) => [...room.players.values()].filter((p) => alive(room, p));
export const currentQ = (room: Room): Question => room.quiz.questions[room.qi];

export function startQuestion(room: Room) {
  room.qi++;
  room.phase = 'question';
  room.answers.clear();
  room.last.clear();
  room.startedAt = Date.now();
  const q = currentQ(room);
  room.endsAt = room.startedAt + q.timeLimit * 1000;
  // Steal a Point: one team owns the question; others may answer after half the time, or once the owner misses
  room.stealAt = room.startedAt + q.timeLimit * 500;
  const act = activePlayers(room);
  room.owner = q.type === 'steal' && act.length ? act[room.qi % act.length].id : undefined;
}

export function submit(room: Room, pid: string, choice: number[]) {
  const p = room.players.get(pid);
  const q = currentQ(room);
  if (!p || room.phase !== 'question' || !alive(room, p) || room.answers.has(pid) || room.pausedLeft !== undefined) return false;
  const now = Date.now();
  if (now > room.endsAt + 500) return false;
  if (!choice.length || choice.some((i) => !Number.isInteger(i) || i < 0 || i >= q.options.length)) return false;
  if (q.type === 'steal') {
    if (pid !== room.owner && now < room.stealAt) return false;
    if (pid === room.owner && !isCorrect(q, choice)) room.stealAt = Math.min(room.stealAt, now);
  }
  room.answers.set(pid, { choice, ms: Math.max(0, now - room.startedAt) });
  return true;
}

export const allAnswered = (room: Room) =>
  activePlayers(room).filter((p) => p.connected).every((p) => room.answers.has(p.id));

export const isCorrect = (q: Question, c: number[]) =>
  q.type === 'poll' || (c.length === q.correct.length && [...c].sort().join() === [...q.correct].sort().join());

/** Everyone answered, or (Fastest Finger / Steal a Point) someone already got it right. */
export function shouldReveal(room: Room) {
  const q = currentQ(room);
  if (allAnswered(room)) return true;
  return (q.type === 'fastest' || q.type === 'steal') && [...room.answers.values()].some((a) => isCorrect(q, a.choice));
}

export function reveal(room: Room) {
  if (room.phase !== 'question') return;
  const q = currentQ(room);
  room.phase = 'reveal';
  room.pausedLeft = undefined;
  const win = q.type === 'fastest' || q.type === 'steal'
    ? [...room.answers.entries()].filter(([, a]) => isCorrect(q, a.choice)).sort((x, y) => x[1].ms - y[1].ms)[0]?.[0]
    : undefined;
  for (const p of activePlayers(room)) {
    const a = room.answers.get(p.id);
    const ok = !!a && isCorrect(q, a.choice);
    let pts = 0;
    if (q.type !== 'poll') {
      if (ok) {
        p.streak++;
        const flat = room.ruleset === 'classic' || room.ruleset === 'lives';
        pts = flat ? q.points : Math.round(q.points * (1 - 0.5 * Math.min(a!.ms / (q.timeLimit * 1000), 1)));
        if (room.ruleset === 'streak') pts += Math.min(p.streak, 5) * 100; // combo bonus
        if (win && p.id !== win) pts = 0; // only the first correct answer scores
      } else {
        p.streak = 0;
        if (room.ruleset === 'lives') p.lives--;
      }
    }
    p.score += pts;
    room.last.set(p.id, { correct: ok, points: pts });
    if (a) room.log.push({ pid: p.id, qi: room.qi, choice: a.choice, correct: ok, points: pts, ms: a.ms });
  }
}

/** Host moves forward: lobby/reveal -> next question, or final after the last one. */
export function advance(room: Room): Phase {
  if (room.qi + 1 >= room.quiz.questions.length) room.phase = 'final';
  else startQuestion(room);
  return room.phase;
}

const board = (room: Room) =>
  [...room.players.values()].sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score, lives: p.lives, streak: p.streak }));

/** Per-role state. Correct answers are never sent before reveal. */
export function view(room: Room, role: 'host' | 'player', pid?: string) {
  const q = room.qi >= 0 ? currentQ(room) : null;
  const revealed = room.phase === 'reveal' || room.phase === 'final';
  const b = board(room);
  const dist = q ? q.options.map((_, i) => [...room.answers.values()].filter((a) => a.choice.includes(i)).length) : [];
  return {
    code: room.code, phase: room.phase, ruleset: room.ruleset, theme: detectTheme(room.quiz), tokens: room.quiz.themeTokens ?? null,
    title: room.quiz.title, paused: room.pausedLeft !== undefined, pausedLeft: room.pausedLeft, qi: room.qi, total: room.quiz.questions.length, now: Date.now(), endsAt: room.endsAt,
    playerCount: room.players.size, max: MAX_PLAYERS, answered: room.answers.size,
    names: role === 'host' && room.phase === 'lobby' ? [...room.players.values()].map((p) => p.name) : undefined,
    q: q && room.phase !== 'lobby' && room.phase !== 'final' ? {
      type: q.type, text: q.text, visual: q.visual, timeLimit: q.timeLimit,
      steal: q.type === 'steal' && room.owner ? { owner: room.players.get(room.owner)?.name, open: Date.now() >= room.stealAt } : undefined,
      // players see option buttons only; the host screen shows option text
      options: role === 'host' || room.phase !== 'question' ? q.options : q.options.map((_, i) => `#${i}`),
      ...(revealed && room.phase === 'reveal' ? { correct: q.correct, explanation: q.explanation, dist } : {}),
    } : null,
    board: role === 'host' || room.phase !== 'question' ? (room.phase === 'final' ? b : b.slice(0, 5)) : undefined,
    me: pid ? { ...b.find((x) => x.id === pid), result: room.last.get(pid), answered: room.answers.has(pid), isOwner: pid === room.owner } : undefined,
  };
}

// ---- CSV export (stage 4) ----
import { line } from './csv';

export function toCsv(room: Room) {
  const ranked = [...room.players.values()].sort((a, b) => b.score - a.score);
  const results = '\ufeff' + [line(['Rank', 'Team', 'Score']), ...ranked.map((p, i) => line([i + 1, p.name, p.score]))].join('\n');
  const rows = [line(['Team', 'Question #', 'Question', 'Answer', 'Correct', 'Points', 'Time (s)'])];
  for (const p of ranked)
    for (let qi = 0; qi <= room.qi && qi < room.quiz.questions.length; qi++) {
      const q = room.quiz.questions[qi];
      const l = room.log.find((x) => x.pid === p.id && x.qi === qi);
      rows.push(line([p.name, qi + 1, q.text, l ? l.choice.map((i) => q.options[i]).join(' | ') : '', l?.correct ? 'yes' : 'no', l?.points ?? 0, l ? (l.ms / 1000).toFixed(2) : '']));
    }
  return { results, answers: '\ufeff' + rows.join('\n') };
}

/** Pause/resume the running question. Resuming shifts all deadlines so speed scoring stays fair. Returns true if now paused. */
export function togglePause(room: Room): boolean {
  if (room.phase !== 'question') return false;
  const now = Date.now();
  if (room.pausedLeft === undefined) { room.pausedLeft = Math.max(1000, room.endsAt - now); return true; }
  const shift = now + room.pausedLeft - room.endsAt;
  room.endsAt += shift; room.startedAt += shift; room.stealAt += shift;
  room.pausedLeft = undefined;
  return false;
}
