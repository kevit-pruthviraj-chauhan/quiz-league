'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useGame } from '../../../lib/useGame';
import { sfx } from '../../../lib/sfx';
import { Visual, Confetti, Mute, Ring, ScoreBreakdown, LETTERS } from '../../../components/bits';
import { ScoreTrend } from '../../../components/ScoreTrend';

const RULE_LABELS: Record<string, string> = {
  speed: '🚀 Kahoot Speed Curve',
  fastest: '⚡ Fastest Finger Race',
  classic: '🎯 Flat Pub Quiz',
  streak: '🔥 Streak Multipliers',
  lives: '🛡️ Survival (3 Lives)',
};

export default function Play() {
  const { code } = useParams<{ code: string }>();
  const [err, setErr] = useState('');
  const [picked, setPicked] = useState<number | null>(null);

  const { state: s, sock, skew } = useGame((so) => {
    let token = localStorage.getItem('ql-token');
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem('ql-token', token);
    }
    so.emit('player:join', { code, name: localStorage.getItem('ql-name') ?? '', token }, (r: any) => {
      if (r?.error) setErr(r.error);
    });
    so.on('kicked', () => setErr('The host removed you from this game.'));
  });

  useEffect(() => {
    setPicked(null);
  }, [s?.qi]);

  useEffect(() => {
    if (s?.phase === 'reveal') {
      const res = s.me?.result;
      if (res?.correct) {
        if (res.streakBonus > 0) sfx.streak();
        else if (res.clutchBonus > 0) sfx.clutch();
        else sfx.ok();
      } else {
        sfx.bad();
      }
    }
    if (s?.phase === 'final') sfx.win();
  }, [s?.phase]);

  if (err) {
    return (
      <main className="wrap center">
        <div className="err" role="alert" style={{ maxWidth: '440px' }}>
          {err}
        </div>
        <Link href="/" className="btn ghost" style={{ textDecoration: 'none', marginTop: '16px' }}>
          Back to Start
        </Link>
      </main>
    );
  }

  if (!s) {
    return (
      <main className="wrap center">
        <div className="wait">⏳</div>
        <p style={{ color: 'var(--ink-muted)' }}>Connecting to game room…</p>
      </main>
    );
  }

  const q = s.q;
  const me = s.me;
  const blocked = !!q?.steal && !q.steal.open && !me?.isOwner;

  const pick = (i: number) => {
    if (picked !== null || me?.answered) return;
    sfx.tap();
    navigator.vibrate?.(40);
    setPicked(i);
    sock?.emit('player:answer', { choice: [i] });
  };

  return (
    <main className="wrap center">
      <Mute />

      {/* LOBBY / WAITING LOUNGE */}
      {s.phase === 'lobby' && (
        <div className="card stack" style={{ maxWidth: '480px', animation: 'pop 0.35s both', textAlign: 'center' }}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: '4px' }}>
            <span className="crest" aria-hidden style={{ fontSize: '2.6rem' }}>♛</span>
          </div>

          <div>
            <span style={{ fontFamily: 'var(--fd), "Cinzel", Georgia, serif', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ac1)' }}>
              Connected &amp; Ready
            </span>
            <h1 className="big" style={{ fontSize: '2.2rem', margin: '4px 0' }}>
              You&apos;re In!
            </h1>
            <p style={{ fontSize: '1.25rem', margin: '6px 0 12px', color: '#ffffff', fontWeight: 800 }}>
              {localStorage.getItem('ql-name')}
            </p>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--r-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--line-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.9rem',
              color: 'var(--ink-muted)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Arena Room</span>
              <b style={{ color: 'var(--ac1)', fontFamily: 'ui-monospace, monospace' }}>{s.code}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Scoring Rules</span>
              <span style={{ color: '#ffffff', fontWeight: 700 }}>{RULE_LABELS[s.ruleset] || `${s.ruleset} Rules`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Competitors</span>
              <span>{s.playerCount} Teams Ready</span>
            </div>
          </div>

          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', margin: '6px 0 0' }}>
            Awaiting host to start Question 1…
          </p>
        </div>
      )}

      {/* PAUSED STATE */}
      {s.phase === 'question' && s.paused && (
        <div className="card stack" style={{ maxWidth: '440px', textAlign: 'center', animation: 'pop 0.3s both' }}>
          <div className="wait">⏸</div>
          <h1 className="big" style={{ fontSize: '2.2rem' }}>Paused</h1>
          <p style={{ color: 'var(--ink-muted)' }}>The host paused the match. Resuming shortly.</p>
        </div>
      )}

      {/* STEAL WINDOW LOCKED */}
      {s.phase === 'question' && q && blocked && !s.paused && (
        <div className="card stack" style={{ maxWidth: '460px', textAlign: 'center', animation: 'pop 0.3s both' }}>
          <div className="wait">⏳</div>
          <h1 className="big" style={{ fontSize: '2rem' }}>{q.steal.owner}&apos;s Turn</h1>
          <p style={{ color: 'var(--ink-muted)' }}>Steal window opens at half time, or immediately if they miss!</p>
        </div>
      )}

      {/* ACTIVE QUESTION PHASE */}
      {s.phase === 'question' && q && !blocked && !s.paused && (
        picked !== null || me?.answered ? (
          <div className="card stack" style={{ animation: 'pop 0.35s both', maxWidth: '500px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>🔒</div>
            <h1 className="big" style={{ fontSize: '2.2rem', margin: '4px 0' }}>
              Locked In!
            </h1>
            <p style={{ color: 'var(--ink-muted)', margin: 0, fontSize: '0.95rem' }}>
              Answer recorded. Waiting for round timer to expire…
            </p>
            {picked !== null && q.options[picked] && (
              <div style={{ marginTop: '12px' }}>
                <div
                  className={`opt o${picked}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px 20px',
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  <span className="sh">{LETTERS[picked] || picked + 1}</span>
                  <span className="opt-text" style={{ fontWeight: 700 }}>{q.options[picked]}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
                Question <b style={{ color: '#fff' }}>{s.qi + 1}</b> of {s.total}
              </span>
              <Ring endsAt={s.endsAt} total={q.timeLimit} skew={skew.current} paused={s.pausedLeft} />
            </div>

            <h2 className="q-text" style={{ margin: '4px 0 8px' }}>
              {q.text}
            </h2>

            <Visual v={q.visual} />

            <div className="opts">
              {q.options.map((optionText: string, i: number) => (
                <button
                  key={i}
                  className={`opt o${i} ${picked === i ? 'picked' : ''}`}
                  onClick={() => pick(i)}
                  aria-label={`Option ${LETTERS[i] || i + 1}: ${optionText}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="sh">{LETTERS[i] || i + 1}</span>
                  <span className="opt-text">{optionText}</span>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {/* REVEAL / SCORE SUMMARY PHASE */}
      {s.phase === 'reveal' && me?.result && (
        <div style={{ width: '100%', maxWidth: '620px', animation: 'slide 0.35s both', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {me.result.correct && <Confetti />}

          <div style={{ textAlign: 'center' }}>
            <h1 className="big" style={{ fontSize: '2.5rem', marginBottom: '4px' }}>
              {me.result.correct ? 'Spot On!' : q?.type === 'poll' ? 'Response Counted' : 'Not Quite!'}
            </h1>
          </div>

          <ScoreBreakdown res={me.result} ruleset={s.ruleset} lives={me.lives} />

          {/* D3 Score Trend & Streak Visualization */}
          {me.history && me.history.length > 0 && (
            <ScoreTrend
              history={me.history}
              totalQuestions={s.total}
              currentStreak={me.streak}
            />
          )}

          <div
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>Total Tournament Score</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ac1)', fontVariantNumeric: 'tabular-nums' }}>
              {me.score.toLocaleString()} <small style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>PTS</small>
            </span>
          </div>
        </div>
      )}

      {s.phase === 'reveal' && !me?.result && (
        <div className="card stack" style={{ maxWidth: '440px', textAlign: 'center' }}>
          <div className="wait">👀</div>
          <h1 className="big" style={{ fontSize: '2rem' }}>
            {s.ruleset === 'lives' && me?.lives === 0 ? 'Eliminated' : 'Round Finished'}
          </h1>
          <p style={{ color: 'var(--ink-muted)' }}>Next question starting shortly!</p>
        </div>
      )}

      {/* FINAL PODIUM & TOURNAMENT WRAP */}
      {s.phase === 'final' && (
        <div style={{ width: '100%', maxWidth: '580px', animation: 'rise 0.5s both', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Confetti />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3.6rem', marginBottom: '4px', lineHeight: 1 }}>
              {me?.rank === 1 ? '🏆' : me?.rank === 2 ? '🥈' : me?.rank === 3 ? '🥉' : '🎖️'}
            </div>
            <span style={{ fontFamily: 'var(--fd), "Cinzel", Georgia, serif', fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ac1)' }}>
              Final Tournament Placement
            </span>
            <h1 className="big" style={{ fontSize: '3rem', margin: '4px 0' }}>
              Rank #{me?.rank}
            </h1>
            <p style={{ fontSize: '1.3rem', margin: '6px 0 16px', color: '#ffffff' }}>
              <b style={{ color: 'var(--ac1)' }}>{me?.score.toLocaleString()}</b> final points
            </p>
          </div>

          {/* D3 Final Score Trend & Streak Journey */}
          {me?.history && me.history.length > 0 && (
            <ScoreTrend
              history={me.history}
              totalQuestions={s.total}
              currentStreak={me.streak}
            />
          )}

          <div className="card stack" style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--ink-muted)' }}>
              Championship concluded. Well played, <b style={{ color: '#ffffff' }}>{localStorage.getItem('ql-name')}</b>!
            </p>
            <Link href="/" className="btn" style={{ textDecoration: 'none', textAlign: 'center', marginTop: '6px' }}>
              Play Again ➔
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
