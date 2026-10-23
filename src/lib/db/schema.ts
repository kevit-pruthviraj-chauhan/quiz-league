import { pgTable, uuid, text, jsonb, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  theme: text('theme').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull(),
  quizId: uuid('quiz_id').references(() => quizzes.id).notNull(),
  ruleset: text('ruleset').notNull(),
  week: integer('week'),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at').notNull(),
});
export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  name: text('name').notNull(),
  score: integer('score').notNull(),
  rank: integer('rank').notNull(),
});
export const answers = pgTable('answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  qIndex: integer('q_index').notNull(),
  choice: jsonb('choice').notNull(),
  correct: boolean('correct').notNull(),
  points: integer('points').notNull(),
  ms: integer('ms').notNull(),
});
