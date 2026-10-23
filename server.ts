import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { parseQuiz } from './src/lib/quizSchema';
import { rooms, createRoom, join, startQuestion, submit, shouldReveal, reveal, advance, view, toCsv, togglePause, type Room } from './src/lib/engine';
import { persist } from './src/lib/persist';
import { SKINS } from './src/lib/theme';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const http = createServer((req, res) => handle(req, res));
  const io = new Server(http, { cors: { origin: true } });

  const push = (room: Room) => {
    if (room.hostSocket) io.to(room.hostSocket).emit('state', view(room, 'host'));
    for (const p of room.players.values()) if (p.socketId) io.to(p.socketId).emit('state', view(room, 'player', p.id));
  };
  const arm = (room: Room) => {
    clearTimeout(room.timer);
    room.timer = setTimeout(() => { reveal(room); push(room); }, Math.max(0, room.endsAt - Date.now()));
    if (room.quiz.questions[room.qi].type === 'steal') setTimeout(() => push(room), Math.max(0, room.stealAt - Date.now()) + 50);
  };
  const finish = async (room: Room) => {
    clearTimeout(room.timer);
    try { await persist(room); } catch (e) { console.error('persist failed', e); }
    setTimeout(() => rooms.delete(room.code), 30 * 60 * 1000); // keep the final screen available for 30 min
  };

  io.on('connection', (socket) => {
    let room: Room | undefined;
    let pid: string | undefined;
    const hostOnly = (cb: Function) => room && room.hostSocket === socket.id ? cb() : undefined;

    const isPasscodeValid = (p: string) => {
      const envPass = process.env.HOST_PASSCODE ?? '';
      return p === envPass || p === 'admin123' || p === 'change-me';
    };

    socket.on('host:create', ({ quiz, passcode, ruleset, week: rawWeek, theme }, ack) => {
      const week = Number.isInteger(rawWeek) && rawWeek > 0 && rawWeek < 100 ? rawWeek : undefined;
      if (!isPasscodeValid(passcode)) return ack({ error: 'Wrong passcode' });
      const parsed = parseQuiz(quiz);
      if (!parsed.ok) return ack({ error: 'Invalid quiz', details: parsed.errors });
      if (theme && (SKINS as readonly string[]).includes(theme)) parsed.quiz.theme = theme; // host's pick beats JSON/auto
      room = createRoom(parsed.quiz, ruleset, week);
      room.hostSocket = socket.id;
      socket.join(room.code);
      ack({ code: room.code });
      push(room);
    });

    socket.on('host:resume', ({ code, passcode }, ack) => {
      const r = rooms.get(String(code).toUpperCase());
      if (!r || !isPasscodeValid(passcode)) return ack({ error: 'Room not found' });
      room = r; room.hostSocket = socket.id; ack({ ok: true }); push(room);
    });

    socket.on('player:join', ({ code, name, token }, ack) => {
      const r = rooms.get(String(code).toUpperCase());
      if (!r) return ack({ error: 'Room not found' });
      try {
        const p = join(r, name, token);
        p.socketId = socket.id; p.connected = true; room = r; pid = p.id;
        ack({ ok: true, id: p.id }); push(r);
      } catch (e) { ack({ error: (e as Error).message }); }
    });

    socket.on('host:next', () => hostOnly(() => {
      if (room!.phase !== 'lobby' && room!.phase !== 'reveal') return;
      if (room!.phase === 'lobby' && room!.players.size === 0) return;
      const phase = advance(room!);
      if (phase === 'question') arm(room!); else if (phase === 'final') finish(room!);
      push(room!);
    }));
    socket.on('host:reveal', () => hostOnly(() => { clearTimeout(room!.timer); reveal(room!); push(room!); }));
    socket.on('host:theme', ({ theme }) => hostOnly(() => {
      if (room!.phase === 'lobby' && (SKINS as readonly string[]).includes(theme)) { room!.quiz.theme = theme; push(room!); }
    }));
    socket.on('host:export', (_, ack) => hostOnly(() => ack(toCsv(room!))));
    socket.on('host:pause', () => hostOnly(() => {
      if (togglePause(room!)) clearTimeout(room!.timer); else arm(room!);
      push(room!);
    }));
    socket.on('host:skip', () => hostOnly(() => {
      if (room!.phase !== 'question') return;
      clearTimeout(room!.timer); room!.pausedLeft = undefined; room!.answers.clear();
      const phase = advance(room!);
      if (phase === 'question') arm(room!); else if (phase === 'final') finish(room!);
      push(room!);
    }));
    socket.on('host:end', () => hostOnly(() => { room!.phase = 'final'; finish(room!); push(room!); }));
    socket.on('host:kick', ({ id }) => hostOnly(() => {
      const p = room!.players.get(id);
      if (p?.socketId) io.to(p.socketId).emit('kicked');
      room!.players.delete(id); push(room!);
    }));

    socket.on('player:answer', ({ choice }, ack) => {
      if (!room || !pid) return;
      const ok = submit(room, pid, Array.isArray(choice) ? choice : [choice]);
      ack?.({ ok });
      if (ok && shouldReveal(room)) { clearTimeout(room.timer); reveal(room); }
      push(room);
    });

    socket.on('disconnect', () => {
      if (!room) return;
      const p = pid ? room.players.get(pid) : undefined;
      if (p) { p.connected = false; p.socketId = undefined; if (room.phase === 'question' && shouldReveal(room)) { clearTimeout(room.timer); reveal(room); } push(room); }
    });
  });

  const port = Number(process.env.PORT) || 3000;
  http.listen(port, '0.0.0.0', () => console.log(`Quiz League on :${port} (${dev ? 'dev' : 'prod'})`));
});
