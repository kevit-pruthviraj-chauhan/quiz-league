import { randomUUID } from 'crypto';
import type { Quiz, Question } from './quizSchema';
import { detectTheme } from './theme';

export const MAX_PLAYERS = 20;
export type Ruleset = 'speed' | 'fastest' | 'classic' | 'streak' | 'lives';
export type Phase = 'lobby' | 'question' | 'reveal' | 'final';

export interface Player { id: string; name: string; token: string; score: number; streak: number; lives: number; socketId?: string; connected: boolean }
export interface LogRow { pid: string; qi: number; choice: number[]; correct: boolean; points: number; ms: number }
export interface ResultBreakdown {
  correct: boolean;
  points: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  clutchBonus: number;
  isFastest: boolean;
  fastestRank?: number;
  streak: number;
  multiplier?: number;
  rank: number;
  rankDelta: number;
  reactionMs?: number;
  ruleset: Ruleset;
  algorithmNote?: string;
}
export interface Room {
  code: string; quiz: Quiz; ruleset: Ruleset; week?: number; phase: Phase; qi: number;
  startedAt: number; endsAt: number; stealAt: number; owner?: string; pausedLeft?: number; createdAt: number; hostSocket?: string; timer?: NodeJS.Timeout;
  players: Map<string, Player>; answers: Map<string, { choice: number[]; ms: number }>;
  last: Map<string, ResultBreakdown>; log: LogRow[];
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

  // Snapshot pre-question ranks
  const preRanks = new Map<string, number>();
  [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .forEach((p, idx) => preRanks.set(p.id, idx + 1));

  const totalPlayers = room.players.size;
  const correctEntries = [...room.answers.entries()]
    .filter(([, a]) => isCorrect(q, a.choice))
    .sort((x, y) => x[1].ms - y[1].ms);
  const fastestCorrectId = correctEntries[0]?.[0];

  const roundResults = new Map<
    string,
    {
      ok: boolean;
      pts: number;
      base: number;
      speed: number;
      streak: number;
      clutch: number;
      isFastest: boolean;
      fastestRank?: number;
      multiplier?: number;
      note?: string;
      ms?: number;
    }
  >();

  for (const p of activePlayers(room)) {
    const a = room.answers.get(p.id);
    const ok = !!a && isCorrect(q, a.choice);
    let base = 0;
    let speed = 0;
    let streakBonus = 0;
    let clutch = 0;
    let multiplier: number | undefined;
    let note: string | undefined;
    const isFastest = ok && p.id === fastestCorrectId;
    let fastestRank: number | undefined;

    if (q.type === 'poll') {
      base = 250;
      note = 'Poll participation credit';
    } else if (ok) {
      p.streak++;

      if (room.ruleset === 'speed') {
        // --- 1. Industry Standard: Kahoot Speed Curve Formula ---
        // Points = round((1 - (response_ms / (2 * time_limit_ms))) * max_points)
        // 100% of max points for instantaneous answer, scaling down to 50% at the buzzer
        const totalMs = q.timeLimit * 1000;
        const timeFraction = Math.max(0, Math.min(1, (a?.ms ?? totalMs) / totalMs));
        const kahootFactor = 1 - timeFraction * 0.5;
        const totalScaled = Math.round(kahootFactor * q.points);
        base = Math.round(q.points * 0.5); // guaranteed accuracy floor (50%)
        speed = Math.max(0, totalScaled - base); // speed component (0% - 50%)

        // Lightning reflex bonus: < 1.8s
        if (a && a.ms <= 1800) speed += 100;
        // Overall fastest responder bonus
        if (isFastest && correctEntries.length > 1) speed += 150;

        // Streak bonuses: 2 in a row: +100, 3: +200, 4: +350, 5+: +500
        if (p.streak >= 2) {
          streakBonus = p.streak === 2 ? 100 : p.streak === 3 ? 200 : p.streak === 4 ? 350 : 500;
        }

        // Underdog clutch comeback: bottom half team in top 3 speeds
        const prevRank = preRanks.get(p.id) ?? 1;
        if (prevRank > Math.ceil(totalPlayers / 2) && correctEntries.slice(0, 3).some(([id]) => id === p.id)) {
          clutch = 100;
        }

        note = 'Kahoot Speed Curve: 50% Base + 50% Speed Scale';
      } else if (room.ruleset === 'fastest') {
        // --- 2. Fastest Finger First / Buzzer Race ---
        const speedRank = correctEntries.findIndex(([id]) => id === p.id) + 1;
        fastestRank = speedRank;

        if (q.type === 'fastest') {
          // Winner-takes-all sudden death round
          if (speedRank === 1) {
            base = q.points;
            speed = 500;
            note = '⚡ Fastest Finger Champion: Winner Takes All!';
          } else {
            base = 0;
            note = 'Fastest Finger: Only the first correct response scores';
          }
        } else {
          // Tiered podium buzzer
          if (speedRank === 1) {
            base = q.points;
            speed = 500; // 🥇 Fastest Finger Jackpot
            note = '🥇 1st Fastest Response (+500 Jackpot)';
          } else if (speedRank === 2) {
            base = Math.round(q.points * 0.8);
            speed = 250; // 🥈 Speed Runner-up
            note = '🥈 2nd Fastest Response (+250 Speed Bonus)';
          } else if (speedRank === 3) {
            base = Math.round(q.points * 0.65);
            speed = 100; // 🥉 Bronze Speed
            note = '🥉 3rd Fastest Response (+100 Podium Bonus)';
          } else {
            base = Math.round(q.points * 0.4);
            note = `Speed Rank #${speedRank}: Accurate response`;
          }
        }
      } else if (room.ruleset === 'classic') {
        // --- 3. Normal Pub Quiz: 100% Pure Accuracy ---
        base = q.points;
        if (p.streak >= 2) streakBonus = Math.min(p.streak - 1, 6) * 50;
        if (isFastest && correctEntries.length > 1) speed = 50;
        note = 'Normal Pub Quiz: 100% Accuracy Points';
      } else if (room.ruleset === 'streak') {
        // --- 4. High-Stakes Streak Multipliers ---
        multiplier = p.streak === 1 ? 1.0 : p.streak === 2 ? 1.25 : p.streak === 3 ? 1.5 : p.streak === 4 ? 1.75 : 2.0;
        base = q.points;
        streakBonus = Math.round(q.points * (multiplier - 1));
        note = `Streak Multiplier: ${multiplier}x Combo Rush!`;
      } else if (room.ruleset === 'lives') {
        // --- 5. Survival / Battle Royale ---
        base = q.points;
        if (p.lives === 1) {
          clutch = 300;
          note = '🛡️ Last Stand: Survived on your final life (+300 bonus)';
        } else {
          note = `Survival Mode: ${p.lives} lives remaining`;
        }
      }

      // Steal question bonus if applicable
      if (q.type === 'steal') {
        if (p.id === room.owner) {
          base = Math.round(base * 1.25);
        } else {
          clutch += 200;
          note = '⚔️ Heist Success: Stole question points!';
        }
      }
    } else {
      p.streak = 0;
      if (room.ruleset === 'lives') {
        p.lives = Math.max(0, p.lives - 1);
        note = p.lives === 0 ? 'Eliminated: All lives lost' : `Incorrect: -1 life (${p.lives} left)`;
      } else {
        note = 'Incorrect response';
      }
    }

    const totalPts = base + speed + streakBonus + clutch;
    p.score += totalPts;

    roundResults.set(p.id, {
      ok,
      pts: totalPts,
      base,
      speed,
      streak: streakBonus,
      clutch,
      isFastest,
      fastestRank,
      multiplier,
      note,
      ms: a?.ms,
    });

    room.log.push({
      pid: p.id,
      qi: room.qi,
      choice: a ? a.choice : [],
      correct: ok,
      points: totalPts,
      ms: a ? a.ms : q.timeLimit * 1000,
    });
  }

  // Calculate post-ranks and rank changes
  const postRanks = new Map<string, number>();
  [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .forEach((p, idx) => postRanks.set(p.id, idx + 1));

  for (const p of activePlayers(room)) {
    const r = roundResults.get(p.id);
    const oldRank = preRanks.get(p.id) ?? 1;
    const newRank = postRanks.get(p.id) ?? 1;
    const rankDelta = oldRank - newRank;

    room.last.set(p.id, {
      correct: r?.ok ?? false,
      points: r?.pts ?? 0,
      basePoints: r?.base ?? 0,
      speedBonus: r?.speed ?? 0,
      streakBonus: r?.streak ?? 0,
      clutchBonus: r?.clutch ?? 0,
      isFastest: r?.isFastest ?? false,
      fastestRank: r?.fastestRank,
      streak: p.streak,
      multiplier: r?.multiplier,
      rank: newRank,
      rankDelta,
      reactionMs: r?.ms,
      ruleset: room.ruleset,
      algorithmNote: r?.note,
    });
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
    .map((p, i) => {
      const lastRes = room.last.get(p.id);
      return {
        rank: i + 1,
        id: p.id,
        name: p.name,
        score: p.score,
        lives: p.lives,
        streak: p.streak,
        rankDelta: lastRes?.rankDelta ?? 0,
      };
    });

export interface PlayerQuestionHistory {
  qi: number;
  qNum: number;
  points: number;
  cumScore: number;
  correct: boolean;
  streak: number;
  reactionMs?: number;
}

export function computePlayerHistory(room: Room, pid: string): PlayerQuestionHistory[] {
  let cum = 0;
  let currStreak = 0;
  const entries = room.log
    .filter((l) => l.pid === pid)
    .sort((a, b) => a.qi - b.qi);

  return entries.map((l) => {
    cum += l.points;
    if (l.correct) {
      currStreak += 1;
    } else {
      currStreak = 0;
    }
    return {
      qi: l.qi,
      qNum: l.qi + 1,
      points: l.points,
      cumScore: cum,
      correct: l.correct,
      streak: currStreak,
      reactionMs: l.ms,
    };
  });
}

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
      options: q.options,
      ...(revealed && room.phase === 'reveal' ? { correct: q.correct, explanation: q.explanation, dist } : {}),
    } : null,
    board: role === 'host' || room.phase !== 'question' ? (room.phase === 'final' ? b : b.slice(0, 5)) : undefined,
    me: pid ? {
      ...b.find((x) => x.id === pid),
      result: room.last.get(pid),
      answered: room.answers.has(pid),
      isOwner: pid === room.owner,
      history: computePlayerHistory(room, pid),
    } : undefined,
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
