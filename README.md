# Quiz League (stage 1: engine, DB, realtime server)

## Local
1. `cp .env.example .env` and fill `DATABASE_URL` (Neon) and `HOST_PASSCODE`
2. `npm install && npm run db:push` (creates tables in Neon)
3. `npm run dev`

## Render (Web Service, single instance)
- Build: `npm install && npm run build`   Start: `npm start`
- Env: `DATABASE_URL`, `HOST_PASSCODE`, `NODE_ENV=production`
- Keep instances at 1: room state lives in server memory.

## Socket events
host:create {quiz, passcode, ruleset?, week?} -> {code}
player:join {code, name, token} -> {ok, id}
host:next | host:reveal | host:end | host:kick {id}
player:answer {choice:number[]}
server -> 'state' (role-shaped view; answers hidden until reveal)

## Stage 2 (this build)
Pages: `/` join, `/host` create + run, `/play/CODE` player. General skin only. Sounds are synthesized; mute button top-right.
Not yet: QR code, per-theme skins, Steal a Point / Fastest Finger rules, pause/skip, history, CSV, League Table.

## Stage 3
Royal look (default "general" skin) plus Science, Space, Patterns, History, Nature skins: palette and option shape via `body[data-skin]` in globals.css, glyphs/wording in `src/lib/skins.ts`.
Fastest Finger (first correct answer takes all, round ends immediately) and Steal a Point (one team owns the question; others unlock at half time or when the owner misses).
Fonts load from Google at build time (Cinzel, Alegreya Sans).

## Stage 4 (CSV only)
Host picks a theme at room creation (live preview) and can change it in the lobby. Final screen has two CSV downloads:
leaderboard (rank, team, score) and answers (per team per question: answer, correct, points, seconds).
Export reads the live room, so download before closing the host tab; rooms are kept ~30 min after the final screen.

## Stage 5
- Host: Pause/Resume (deadlines shift, phones show a pause screen) and Skip question (no points). Optional week number at room creation.
- `/history`: League Table (per-week and total, teams matched case-insensitively) and past sessions with leaderboard/answers CSV, read from Neon. Host passcode required; sent in an `x-host-pass` header.
- Past-session answers CSV only contains answered questions (unanswered rows are not stored).
- Not built: QR code (skipped by request).
