'use client';
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';
import { SKINS } from '../lib/skins';

/** Sets the page skin (palette/shape via CSS) and returns its glyphs and wording. Host-supplied token colors are limited to hex. */
export function useSkin(theme?: string, tokens?: { colors?: Record<string, string> } | null) {
  useEffect(() => {
    document.body.dataset.skin = theme && theme in SKINS ? theme : 'general';
    for (const [k, v] of Object.entries(tokens?.colors ?? {}))
      if (['bg1', 'bg2', 'ac1', 'ac2', 'ink'].includes(k) && /^#[0-9a-f]{3,8}$/i.test(v)) document.body.style.setProperty('--' + k, v);
  }, [theme, tokens]);
  return SKINS[(theme as keyof typeof SKINS) in SKINS ? (theme as keyof typeof SKINS) : 'general'];
}

export function Decor({ sk }: { sk: { glyphs: readonly string[] } }) {
  const [d, setD] = useState<any[]>([]);
  useEffect(() => setD(Array.from({ length: 14 }, (_, i) => ({ g: sk.glyphs[i % sk.glyphs.length], l: Math.random() * 100, s: 28 + Math.random() * 60, t: 18 + Math.random() * 20, dl: -Math.random() * 20 }))), [sk]);
  return <div className="decor" aria-hidden>{d.map((x, i) => <span key={i} style={{ left: x.l + '%', fontSize: x.s, animationDuration: x.t + 's', animationDelay: x.dl + 's' }}>{x.g}</span>)}</div>;
}

export function useLeft(endsAt: number, skew: number) {
  const [l, setL] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => { setL(Math.max(0, (endsAt - (Date.now() + skew)) / 1000)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endsAt, skew]);
  return l;
}

/** Countdown dial: smooth 60fps arc that drains clockwise, 60 ticks that go dark as time passes, accent -> amber -> red, number pops each second. */
export function Ring({ endsAt, total, skew, paused }: { endsAt: number; total: number; skew: number; paused?: number }) {
  const live = useLeft(endsAt, skew);
  const left = paused !== undefined ? paused / 1000 : live;
  const f = Math.min(1, left / total);
  const sec = Math.ceil(left);
  const prev = useRef(99);
  useEffect(() => {
    if (paused === undefined && sec <= 3 && sec > 0 && sec !== prev.current) sfx.tick();
    prev.current = sec;
  }, [sec, paused]);
  const r = 40, C = 2 * Math.PI * r;
  const cls = 'ring' + (paused !== undefined ? ' paused' : left <= 5 ? ' hot' : f <= 0.5 ? ' warn' : '');
  return (
    <svg className={cls} viewBox="0 0 100 100" role="timer" aria-label={`${sec} seconds left`}>
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} className={i < f * 60 ? 'tk on' : 'tk'} x1="50" y1="4" x2="50" y2={i % 5 ? 6.5 : 9} transform={`rotate(${i * 6} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r={r} className="trk" />
      <circle cx="50" cy="50" r={r} className="val" transform="rotate(-90 50 50)" strokeDasharray={C} strokeDashoffset={C * (1 - f)} />
      <text key={sec} x="50" y="50" textAnchor="middle" dominantBaseline="central">{sec}</text>
    </svg>
  );
}

export function Visual({ v }: { v?: string[][] }) {
  if (!v) return null;
  return <div className="vis">{v.map((row, i) => <div key={i}>{row.map((c, j) => <span key={j} className={c === '?' ? 'cell q' : 'cell'}>{c}</span>)}</div>)}</div>;
}

export function Board({ rows, me }: { rows: any[]; me?: string }) {
  return (
    <ol className="board">
      {rows.map((r, i) => (
        <li key={r.id + ':' + r.rank} className={r.id === me ? 'me' : ''} style={{ animationDelay: i * 60 + 'ms' }}>
          <b>{r.rank}</b><span>{r.name}</span><em>{r.score}</em>
        </li>
      ))}
    </ol>
  );
}

export function Confetti() {
  const bits = useRef(Array.from({ length: 28 }, () => ({ l: Math.random() * 100, d: Math.random() * 0.5, c: Math.floor(Math.random() * 6), s: 6 + Math.random() * 8 })));
  return <div className="confetti" aria-hidden>{bits.current.map((b, i) => <i key={i} className={'o' + b.c} style={{ left: b.l + '%', animationDelay: b.d + 's', width: b.s, height: b.s }} />)}</div>;
}

export function Mute() {
  const [m, setM] = useState(false);
  useEffect(() => setM(localStorage.getItem('ql-mute') === '1'), []);
  return <button className="mute" aria-label="Toggle sound" onClick={() => { const n = !m; setM(n); localStorage.setItem('ql-mute', n ? '1' : '0'); }}>{m ? '🔇' : '🔊'}</button>;
}
