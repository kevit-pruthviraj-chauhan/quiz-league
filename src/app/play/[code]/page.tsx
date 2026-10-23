'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useGame } from '../../../lib/useGame';
import { sfx } from '../../../lib/sfx';
import { Visual, Confetti, Mute, Ring, Decor, useSkin } from '../../../components/bits';

export default function Play() {
  const { code } = useParams<{ code: string }>();
  const [err, setErr] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const { state: s, sock, skew } = useGame((so) => {
    let token = localStorage.getItem('ql-token');
    if (!token) { token = crypto.randomUUID(); localStorage.setItem('ql-token', token); }
    so.emit('player:join', { code, name: localStorage.getItem('ql-name') ?? '', token }, (r: any) => r.error && setErr(r.error));
    so.on('kicked', () => setErr('The host removed you from this game.'));
  });
  const sk = useSkin(s?.theme, s?.tokens);
  useEffect(() => setPicked(null), [s?.qi]);
  useEffect(() => {
    if (s?.phase === 'reveal') (s.me?.result?.correct ? sfx.ok : sfx.bad)();
    if (s?.phase === 'final') sfx.win();
  }, [s?.phase]);

  if (err) return <main className="wrap center"><div className="err" role="alert">{err}</div><Link href="/">Back to start</Link></main>;
  if (!s) return <main className="wrap center"><div className="wait">⏳</div></main>;

  const q = s.q, me = s.me;
  const blocked = !!q?.steal && !q.steal.open && !me?.isOwner;
  const pick = (i: number) => {
    if (picked !== null || me?.answered) return;
    sfx.tap(); navigator.vibrate?.(30); setPicked(i);
    sock?.emit('player:answer', { choice: [i] });
  };
  return (
    <main className="wrap center">
      <Mute /><Decor sk={sk} />
      {s.phase === 'lobby' && <><div className="wait">{sk.wait}</div><h1 className="big">You&apos;re in!</h1><p>{localStorage.getItem('ql-name')} · waiting for the host to start</p></>}
      {s.phase === 'question' && s.paused && <><div className="wait">⏸</div><h1 className="big">Paused</h1><p>The host will resume shortly.</p></>}
      {s.phase === 'question' && q && blocked && !s.paused && <><div className="wait">{sk.wait}</div><h1 className="big">{q.steal.owner}&apos;s question</h1><p>Steal opens soon, or right away if they miss.</p></>}
      {s.phase === 'question' && q && !blocked && !s.paused && (
        picked !== null || me?.answered
          ? <><div className="wait">🔒</div><h1 className="big">Locked in</h1><p>Waiting for others…</p></>
          : <>
              <Ring endsAt={s.endsAt} total={q.timeLimit} skew={skew.current} paused={s.pausedLeft} />
              <h2 style={{ margin: 0 }}>{q.text}</h2>
              <Visual v={q.visual} />
              <div className="opts" style={{ width: '100%' }}>{q.options.map((_: string, i: number) => <button key={i} className={`opt o${i}`} onClick={() => pick(i)} aria-label={`Answer ${i + 1}`}>{sk.glyphs[i]}</button>)}</div>
            </>
      )}
      {s.phase === 'reveal' && me?.result && (
        <div className={me.result.correct ? '' : 'shake'}>
          {me.result.correct && <Confetti />}
          <h1 className="big">{me.result.correct ? sk.win : q?.type === 'poll' ? 'Thanks!' : sk.lose}</h1>
          <p>+{me.result.points} points · rank {me.rank} · {me.score} total{s.ruleset === 'lives' ? ` · ${'❤'.repeat(Math.max(0, me.lives))}` : ''}</p>
        </div>
      )}
      {s.phase === 'reveal' && !me?.result && <><div className="wait">👀</div><h1 className="big">{s.ruleset === 'lives' ? 'You are out' : 'Missed it'}</h1></>}
      {s.phase === 'final' && <><Confetti /><h1 className="big">#{me?.rank}</h1><p>{me?.score} points · thanks for playing</p><Link href="/">Play again</Link></>}
    </main>
  );
}
