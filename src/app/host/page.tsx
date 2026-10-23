'use client';
import { useEffect, useState } from 'react';
import { useGame } from '../../lib/useGame';
import { sfx } from '../../lib/sfx';
import { SKINS } from '../../lib/skins';
import { Ring, Visual, Board, Confetti, Mute, Decor, useSkin } from '../../components/bits';

const SAMPLE = JSON.stringify({
  title: 'Pattern Warm-up', tags: ['pattern', 'logic'], ruleset: 'speed',
  questions: [
    { type: 'mcq', text: 'Which shape completes the sequence?', visual: [['🔺', '🔵', '🔺', '🔵', '?']], options: ['🔺', '🔵', '🟩', '⭐'], correct: [0], timeLimit: 15, explanation: 'The shapes alternate.' },
    { type: 'tf', text: 'Is 2, 4, 8, 16 a doubling sequence?', options: ['True', 'False'], correct: [0], timeLimit: 10 },
    { type: 'mcq', text: 'Next number: 1, 1, 2, 3, 5, ?', options: ['6', '7', '8', '9'], correct: [2], timeLimit: 15, explanation: 'Fibonacci: add the previous two.' },
  ],
}, null, 2);

const ThemePick = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Theme">
    <option value="">Auto-detect theme</option>
    {Object.entries(SKINS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
  </select>
);

export default function Host() {
  const [pass, setPass] = useState('');
  const [json, setJson] = useState(SAMPLE);
  const [errs, setErrs] = useState<string[]>([]);
  const [theme, setTheme] = useState('');
  const [week, setWeek] = useState('');
  const { state: s, sock, skew } = useGame((so) => {
    const saved = sessionStorage.getItem('ql-host');
    if (saved) so.emit('host:resume', JSON.parse(saved), (r: any) => { if (r.error) sessionStorage.removeItem('ql-host'); });
  });
  const sk = useSkin(s?.theme ?? (theme || undefined), s?.tokens);
  useEffect(() => {
    if (!s) return;
    if (s.phase === 'question') sfx.start();
    if (s.phase === 'reveal') sfx.ok();
    if (s.phase === 'final') sfx.win();
  }, [s?.phase, s?.qi]);

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    let quiz: unknown;
    try { quiz = JSON.parse(json); } catch (x) { return setErrs(['Not valid JSON: ' + (x as Error).message]); }
    sock?.emit('host:create', { quiz, passcode: pass, theme: theme || undefined, week: Number(week) || undefined }, (r: any) => {
      if (r.error) return setErrs([r.error, ...(r.details ?? [])]);
      sessionStorage.setItem('ql-host', JSON.stringify({ code: r.code, passcode: pass }));
    });
  };

  if (!s) return (
    <main className="wrap center">
      <h1 className="logo">Host a quiz</h1>
      <form className="card stack" style={{ maxWidth: 720 }} onSubmit={create}>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Host passcode" aria-label="Host passcode" required />
        <ThemePick value={theme} onChange={setTheme} />
        <input type="number" min={1} max={99} value={week} onChange={(e) => setWeek(e.target.value)} placeholder="Week number (optional, for the League Table)" aria-label="Week number" />
        <textarea value={json} onChange={(e) => setJson(e.target.value)} aria-label="Quiz JSON" spellCheck={false} />
        {errs.length > 0 && <div className="err" role="alert">{errs.map((x, i) => <div key={i}>{x}</div>)}</div>}
        <button className="btn">Create room</button>
      </form>
    </main>
  );

  const q = s.q;
  const next = () => sock?.emit('host:next');
  const exportCsv = (kind: 'results' | 'answers') => sock?.emit('host:export', null, (r: any) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([r[kind]], { type: 'text/csv;charset=utf-8' }));
    a.download = `${s.code}-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  });
  return (
    <main className="wrap">
      <Mute /><Decor sk={sk} />
      {s.phase === 'lobby' && (
        <div className="center stack" style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <p style={{ margin: 0 }}>Join at <u>{typeof location !== 'undefined' ? location.host : ''}</u> with code</p>
          <h1 className="code">{s.code}</h1>
          <div className="chips">{s.names?.map((n: string) => <span className="chip" key={n}>{n}</span>)}</div>
          <p>{s.playerCount} / {s.max} joined · {s.title}</p>
          <ThemePick value={s.theme} onChange={(t) => sock?.emit('host:theme', { theme: t })} />
          <button className="btn" disabled={!s.playerCount} onClick={next}>Start quiz</button>
        </div>
      )}
      {s.phase === 'question' && q && (
        <>
          <div className="row"><span>Question {s.qi + 1} of {s.total}</span><span>{q.steal ? `${q.steal.open ? 'Steal is open! Owner: ' : 'Owner: '}${q.steal.owner} · ` : ''}{s.answered} / {s.playerCount} answered</span><Ring endsAt={s.endsAt} total={q.timeLimit} skew={skew.current} paused={s.pausedLeft} /></div>
          <h2 className="q-text">{q.text}</h2>
          <Visual v={q.visual} />{q.type === 'fastest' && <p>⚡ First correct answer takes all the points</p>}
          <div className="opts">{q.options.map((o: string, i: number) => <div key={i} className={`opt o${i}`} style={{ animationDelay: i * 80 + 'ms' }}><span className="sh">{sk.glyphs[i]}</span>{o}</div>)}</div>
          {s.paused && <h2 className="big" style={{ textAlign: 'center' }}>Paused</h2>}
          <div className="chips">
            <button className="btn" onClick={() => sock?.emit('host:pause')}>{s.paused ? 'Resume' : 'Pause'}</button>
            <button className="btn ghost" onClick={() => sock?.emit('host:reveal')}>Reveal now</button>
            <button className="btn ghost" onClick={() => sock?.emit('host:skip')}>Skip question</button>
          </div>
        </>
      )}
      {s.phase === 'reveal' && q && (
        <>
          <h2 className="q-text">{q.text}</h2>
          <div className="opts">{q.options.map((o: string, i: number) => (
            <div key={i} className={`opt o${i} ${q.correct?.includes(i) ? 'win' : 'dim'}`}><span className="sh">{sk.glyphs[i]}</span>{o}<span className="n">{q.dist?.[i] ?? 0}</span></div>
          ))}</div>
          {q.explanation && <p>{q.explanation}</p>}
          <Board rows={s.board ?? []} />
          <button className="btn" onClick={next}>{s.qi + 1 >= s.total ? 'Final results' : 'Next question'}</button>
        </>
      )}
      {s.phase === 'final' && (
        <div className="center stack" style={{ alignItems: 'center' }}>
          <Confetti />
          <h1 className="logo">Final results</h1>
          <div className="pod">{[1, 0, 2].map((i) => s.board?.[i] && <div key={i} className={`p${i + 1}`}><b>{s.board[i].name}</b><span>{s.board[i].score}</span></div>)}</div>
          <Board rows={s.board ?? []} />
          <div className="chips">
            <button className="btn" onClick={() => exportCsv('results')}>Download leaderboard CSV</button>
            <button className="btn" onClick={() => exportCsv('answers')}>Download answers CSV</button>
            <button className="btn ghost" onClick={() => { sessionStorage.removeItem('ql-host'); location.reload(); }}>New quiz</button>
          </div>
        </div>
      )}
    </main>
  );
}
