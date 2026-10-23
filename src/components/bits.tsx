'use client';
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function useSkin() {
  return { glyphs: LETTERS, wait: '⏳', win: 'Correct!', lose: 'Incorrect' };
}

export function Decor() {
  return null;
}

export function useLeft(endsAt: number, skew: number) {
  const [l, setL] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setL(Math.max(0, (endsAt - (Date.now() + skew)) / 1000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endsAt, skew]);
  return l;
}

/** Precision Chronometer Dial: 60 ticks that deactivate clockwise, noble gold -> amber -> crimson, with central countdown number */
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

  const r = 38;
  const C = 2 * Math.PI * r;
  const cls = 'ring' + (paused !== undefined ? ' paused' : left <= 5 ? ' hot' : f <= 0.4 ? ' warn' : '');

  return (
    <svg className={cls} viewBox="0 0 100 100" role="timer" aria-label={`${sec} seconds remaining`}>
      {/* 60 Chronometer graduation ticks */}
      {Array.from({ length: 60 }, (_, i) => {
        const isMajor = i % 5 === 0;
        return (
          <line
            key={i}
            className={i < f * 60 ? 'tk on' : 'tk'}
            x1="50"
            y1={isMajor ? '3.5' : '5'}
            x2="50"
            y2={isMajor ? '9.5' : '7.5'}
            transform={`rotate(${i * 6} 50 50)`}
          />
        );
      })}
      {/* Background Track */}
      <circle cx="50" cy="50" r={r} className="trk" />
      {/* Dynamic Animated Meter */}
      <circle
        cx="50"
        cy="50"
        r={r}
        className="val"
        transform="rotate(-90 50 50)"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - f)}
      />
      {/* Central Value */}
      <text key={sec} x="50" y="52" textAnchor="middle" dominantBaseline="central">
        {sec}
      </text>
    </svg>
  );
}

export function Visual({ v }: { v?: string[][] }) {
  if (!v) return null;
  return (
    <div className="vis" style={{ margin: '8px 0 14px' }}>
      {v.map((row, i) => (
        <div key={i}>
          {row.map((c, j) => (
            <span key={j} className={c === '?' ? 'cell q' : 'cell'}>
              {c}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Board({ rows, me }: { rows: any[]; me?: string }) {
  return (
    <ol className="board">
      {rows.map((r, i) => {
        const isMe = r.id === me;
        const isGold = r.rank === 1;
        const isSilver = r.rank === 2;
        const isBronze = r.rank === 3;

        return (
          <li
            key={r.id + ':' + r.rank}
            className={isMe ? 'me' : ''}
            style={{
              animationDelay: `${i * 50}ms`,
              borderLeft: isGold
                ? '4px solid #f8df8d'
                : isSilver
                ? '4px solid #cbd5e1'
                : isBronze
                ? '4px solid #f59e0b'
                : '1px solid var(--line)',
            }}
          >
            {/* Rank Badge */}
            <div
              style={{
                width: '32px',
                height: '32px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '6px',
                background: isGold
                  ? 'linear-gradient(135deg, rgba(248, 223, 141, 0.3), rgba(197, 151, 56, 0.2))'
                  : 'rgba(255, 255, 255, 0.06)',
                border: isGold ? '1px solid var(--ac1)' : '1px solid var(--line-subtle)',
                color: isGold ? 'var(--ac1)' : isSilver ? '#e2e8f0' : isBronze ? '#fcd34d' : 'var(--ink-muted)',
                fontWeight: 800,
                fontSize: '0.95rem',
                fontFamily: 'var(--fd), "Cinzel", Georgia, serif',
                flexShrink: 0,
              }}
            >
              {r.rank === 1 ? '1' : r.rank === 2 ? '2' : r.rank === 3 ? '3' : r.rank}
            </div>

            {/* Team Info */}
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span style={{ fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {r.name}
              </span>
              {isMe && (
                <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--ac1)', color: '#1a0f02', fontWeight: 800 }}>
                  YOU
                </span>
              )}
              {r.streak >= 2 && <span className="streak-tag">🔥 {r.streak}</span>}
              {r.rankDelta > 0 && <span className="delta-tag up">▲+{r.rankDelta}</span>}
              {r.rankDelta < 0 && <span className="delta-tag dn">▼{r.rankDelta}</span>}
            </span>

            {/* Score */}
            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
              <em
                style={{
                  fontStyle: 'normal',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  color: isGold ? 'var(--ac1)' : '#ffffff',
                }}
              >
                {r.score.toLocaleString()}
              </em>
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontWeight: 700 }}>PTS</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ScoreBreakdown({ res, ruleset, lives }: { res: any; ruleset?: string; lives?: number }) {
  if (!res) return null;
  const isCorrect = res.correct;
  const pts = res.points ?? 0;

  return (
    <div className="card breakdown-card stack" style={{ animation: 'pop 0.35s both', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.4rem', marginBottom: '2px', lineHeight: 1 }}>
          {isCorrect ? '✨' : '❌'}
        </div>
        <div className="big" style={{ fontSize: '2.4rem', margin: '4px 0' }}>
          {isCorrect ? `+${pts.toLocaleString()} PTS` : '+0 PTS'}
        </div>

        {res.rankDelta > 0 ? (
          <div className="rank-banner up">▲ Advanced {res.rankDelta} {res.rankDelta === 1 ? 'place' : 'places'} to #{res.rank}</div>
        ) : res.rank === 1 ? (
          <div className="rank-banner gold">👑 Holding 1st Place on the Leaderboard!</div>
        ) : res.rankDelta < 0 ? (
          <div className="rank-banner dn">▼ Dropped {Math.abs(res.rankDelta)} {Math.abs(res.rankDelta) === 1 ? 'place' : 'places'} to #{res.rank}</div>
        ) : (
          <div className="rank-banner">Current Standing: Rank #{res.rank}</div>
        )}
      </div>

      {res.algorithmNote && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.84rem',
            color: 'var(--ink-muted)',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--line-subtle)',
          }}
        >
          {res.algorithmNote}
        </div>
      )}

      {isCorrect && (
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Base Points</span>
            <span className="stat-val">+{res.basePoints ?? 0}</span>
          </div>

          {(res.speedBonus > 0 || res.reactionMs) && (
            <div className="stat-item">
              <span className="stat-label">
                Speed Reflex {res.reactionMs ? `(⚡ ${(res.reactionMs / 1000).toFixed(2)}s)` : ''}
                {res.fastestRank === 1 ? ' 🥇 Fastest Finger' : res.fastestRank === 2 ? ' 🥈 2nd' : res.fastestRank === 3 ? ' 🥉 3rd' : ''}
              </span>
              <span className="stat-val">+{res.speedBonus ?? 0}</span>
            </div>
          )}

          {res.streakBonus > 0 && (
            <div className="stat-item">
              <span className="stat-label">
                Streak Multiplier {res.multiplier ? `(${res.multiplier}x)` : `(🔥 x${res.streak})`}
              </span>
              <span className="stat-val">+{res.streakBonus}</span>
            </div>
          )}

          {res.clutchBonus > 0 && (
            <div className="stat-item">
              <span className="stat-label">🎯 Clutch Underdog Boost</span>
              <span className="stat-val">+{res.clutchBonus}</span>
            </div>
          )}
        </div>
      )}

      {ruleset === 'lives' && (
        <div style={{ textAlign: 'center', fontSize: '1.15rem', marginTop: '6px' }}>
          {lives !== undefined && lives > 0 ? (
            <span>Remaining Lives: {'❤️'.repeat(lives)}</span>
          ) : (
            <span style={{ color: '#ef4444', fontWeight: 800 }}>Eliminated — Zero lives remaining</span>
          )}
        </div>
      )}
    </div>
  );
}

export function OptionDistributionBar({
  count,
  total,
  isCorrect,
  glyph,
  text,
  index,
}: {
  count: number;
  total: number;
  isCorrect: boolean;
  glyph?: string;
  text: string;
  index: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const label = glyph || LETTERS[index] || `#${index + 1}`;

  return (
    <div
      className={`opt o${index} ${isCorrect ? 'win' : 'dim'}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderLeft: isCorrect ? '4px solid var(--ac1)' : undefined,
      }}
    >
      <div
        className="bar-fill"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct}%`,
          background: 'rgba(255, 255, 255, 0.22)',
          pointerEvents: 'none',
          transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
      <span className="sh" style={{ position: 'relative', zIndex: 1 }}>
        {label}
      </span>
      <span className="opt-text" style={{ position: 'relative', zIndex: 1, fontWeight: isCorrect ? 800 : 600 }}>
        {text}
      </span>
      <span
        className="n"
        style={{
          position: 'relative',
          zIndex: 1,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>
          {count} <small style={{ opacity: 0.8 }}>({pct}%)</small>
        </span>
        {isCorrect && <span style={{ color: 'var(--ac1)', fontSize: '1.2rem' }}>✓</span>}
      </span>
    </div>
  );
}

export function Confetti() {
  const bits = useRef(
    Array.from({ length: 36 }, () => ({
      l: Math.random() * 100,
      d: Math.random() * 0.8,
      c: Math.floor(Math.random() * 6),
      s: 7 + Math.random() * 9,
    }))
  );
  return (
    <div className="confetti" aria-hidden>
      {bits.current.map((b, i) => (
        <i
          key={i}
          className={'o' + b.c}
          style={{
            left: b.l + '%',
            animationDelay: b.d + 's',
            width: b.s,
            height: b.s,
          }}
        />
      ))}
    </div>
  );
}

export function Mute() {
  const [m, setM] = useState(false);
  useEffect(() => setM(localStorage.getItem('ql-mute') === '1'), []);

  return (
    <button
      className="mute"
      aria-label={m ? 'Unmute sounds' : 'Mute sounds'}
      title={m ? 'Sound muted - click to enable audio' : 'Audio enabled - click to mute'}
      onClick={() => {
        const n = !m;
        setM(n);
        localStorage.setItem('ql-mute', n ? '1' : '0');
        if (!n) sfx.tap();
      }}
    >
      {m ? '🔇' : '🔊'}
    </button>
  );
}
