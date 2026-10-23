import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { quizzes, sessions, players, answers } from './schema';
import { randomUUID } from 'crypto';

export interface MemQuiz {
  id: string;
  title: string;
  theme: string;
  data: any;
  createdAt: Date;
}

export interface MemSession {
  id: string;
  code: string;
  quizId: string;
  ruleset: string;
  week: number | null;
  startedAt: Date;
  endedAt: Date;
}

export interface MemPlayer {
  id: string;
  sessionId: string;
  name: string;
  score: number;
  rank: number;
}

export interface MemAnswer {
  id: string;
  sessionId: string;
  playerId: string;
  qIndex: number;
  choice: any;
  correct: boolean;
  points: number;
  ms: number;
}

// Global in-memory storage so data survives route reloads in dev mode
const g = globalThis as unknown as {
  __ql_mem_quizzes?: MemQuiz[];
  __ql_mem_sessions?: MemSession[];
  __ql_mem_players?: MemPlayer[];
  __ql_mem_answers?: MemAnswer[];
};

g.__ql_mem_quizzes = g.__ql_mem_quizzes ?? [];
g.__ql_mem_sessions = g.__ql_mem_sessions ?? [];
g.__ql_mem_players = g.__ql_mem_players ?? [];
g.__ql_mem_answers = g.__ql_mem_answers ?? [];

const memQuizzes = g.__ql_mem_quizzes;
const memSessions = g.__ql_mem_sessions;
const memPlayers = g.__ql_mem_players;
const memAnswers = g.__ql_mem_answers;

let realDb: any = null;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
    realDb = drizzle(pool, { schema });
  } catch (e) {
    console.warn('[AI Studio] Could not initialize Postgres pool, using in-memory mock:', e);
  }
}

function isTable(target: any, expected: any, tableName: string) {
  if (!target) return false;
  if (target === expected) return true;
  if ((target as any)?._?.name === tableName) return true;
  return false;
}

function findUUID(obj: any, depth = 0): string | null {
  if (!obj || depth > 8) return null;
  if (typeof obj === 'string') {
    return /^[0-9a-f-]{36}$/i.test(obj) ? obj : null;
  }
  if (typeof obj === 'object') {
    if (obj.value && typeof obj.value === 'string' && /^[0-9a-f-]{36}$/i.test(obj.value)) {
      return obj.value;
    }
    for (const key of Object.keys(obj)) {
      const res = findUUID(obj[key], depth + 1);
      if (res) return res;
    }
  }
  return null;
}

export const memStore = {
  quizzes: memQuizzes,
  sessions: memSessions,
  players: memPlayers,
  answers: memAnswers,
};

const memDb = {
  insert(table: any) {
    return {
      values(valOrVals: any) {
        const rows = Array.isArray(valOrVals) ? valOrVals : [valOrVals];
        const insertedRows: any[] = [];
        for (const r of rows) {
          const item = { ...r, id: r.id || randomUUID() };
          if (isTable(table, quizzes, 'quizzes')) {
            memQuizzes.push(item as MemQuiz);
          } else if (isTable(table, sessions, 'sessions')) {
            memSessions.push(item as MemSession);
          } else if (isTable(table, players, 'players')) {
            memPlayers.push(item as MemPlayer);
          } else if (isTable(table, answers, 'answers')) {
            memAnswers.push(item as MemAnswer);
          }
          insertedRows.push(item);
        }

        const thenable = {
          then(resolve: any, reject?: any) {
            return Promise.resolve(insertedRows).then(resolve, reject);
          },
          returning(_fields?: any) {
            return Promise.resolve(insertedRows);
          },
        };
        return thenable;
      },
    };
  },

  select(_selection?: any) {
    let sourceTable: any = null;
    const joins: any[] = [];
    let whereFilter: any = null;
    let limitVal: number | null = null;

    const builder: any = {
      from(table: any) {
        sourceTable = table;
        return builder;
      },
      innerJoin(table: any, condition?: any) {
        joins.push({ type: 'inner', table, condition });
        return builder;
      },
      leftJoin(table: any, condition?: any) {
        joins.push({ type: 'left', table, condition });
        return builder;
      },
      where(cond: any) {
        whereFilter = cond;
        return builder;
      },
      groupBy(..._args: any[]) {
        return builder;
      },
      orderBy(..._args: any[]) {
        return builder;
      },
      limit(n: number) {
        limitVal = n;
        return builder;
      },
      async then(resolve: any, reject?: any) {
        try {
          let results: any[] = [];
          const uuid = findUUID(whereFilter);

          if (isTable(sourceTable, sessions, 'sessions')) {
            if (joins.some((j) => isTable(j.table, quizzes, 'quizzes')) && uuid) {
              const matchedSession = memSessions.find((s) => s.id === uuid);
              if (matchedSession) {
                const q = memQuizzes.find((quiz) => quiz.id === matchedSession.quizId);
                results = [{ data: q ? q.data : null }];
              } else {
                results = [];
              }
            } else {
              const sorted = [...memSessions].sort(
                (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()
              );
              results = sorted.map((s) => {
                const q = memQuizzes.find((quiz) => quiz.id === s.quizId);
                const teamCount = memPlayers.filter((p) => p.sessionId === s.id).length;
                return {
                  id: s.id,
                  code: s.code,
                  week: s.week ?? null,
                  ruleset: s.ruleset,
                  endedAt: s.endedAt,
                  title: q?.title ?? 'Quiz',
                  theme: q?.theme ?? 'general',
                  teams: teamCount,
                };
              });
              if (limitVal) results = results.slice(0, limitVal);
            }
          } else if (isTable(sourceTable, players, 'players')) {
            if (joins.some((j) => isTable(j.table, sessions, 'sessions'))) {
              results = memPlayers.map((p) => {
                const s = memSessions.find((sess) => sess.id === p.sessionId);
                return {
                  name: p.name,
                  week: s?.week ?? null,
                  score: p.score,
                };
              });
            } else {
              let filtered = memPlayers;
              if (uuid) {
                filtered = memPlayers.filter((p) => p.sessionId === uuid);
              }
              filtered.sort((a, b) => a.rank - b.rank);
              results = filtered.map((p) => ({
                id: p.id,
                name: p.name,
                rank: p.rank,
                score: p.score,
                sessionId: p.sessionId,
              }));
            }
          } else if (isTable(sourceTable, answers, 'answers')) {
            let filtered = memAnswers;
            if (uuid) {
              filtered = memAnswers.filter((a) => a.sessionId === uuid);
            }
            results = filtered.map((a) => {
              const p = memPlayers.find((player) => player.id === a.playerId);
              return {
                name: p?.name ?? 'Unknown',
                rank: p?.rank ?? 1,
                a,
              };
            });
            results.sort((x, y) => x.rank - y.rank || x.a.qIndex - y.a.qIndex);
          }

          return resolve(results);
        } catch (err) {
          if (reject) return reject(err);
          throw err;
        }
      },
    };

    return builder;
  },
};

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {},
  {
    get(_target, prop) {
      if (realDb && typeof realDb[prop] === 'function') {
        return (...args: any[]) => {
          try {
            return realDb[prop](...args);
          } catch (e) {
            console.warn(`[AI Studio] Real DB call failed for ${String(prop)}, falling back to in-memory:`, e);
            return (memDb as any)[prop]?.(...args);
          }
        };
      }
      return (memDb as any)[prop];
    },
  }
) as any;
