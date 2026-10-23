'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGame } from '../../lib/useGame';
import { sfx } from '../../lib/sfx';
import { Ring, Visual, Board, Confetti, Mute, OptionDistributionBar, LETTERS } from '../../components/bits';

const PRESETS = [
  {
    id: 'pattern',
    name: 'Pattern & Logic',
    desc: 'Visual sequences, math & brain teasers',
    data: {
      title: 'Pattern & Logic Warm-up',
      tags: ['pattern', 'logic'],
      ruleset: 'speed',
      questions: [
        { type: 'mcq', text: 'Which shape completes the sequence?', visual: [['🔺', '🔵', '🔺', '🔵', '?']], options: ['🔺 Red Triangle', '🔵 Blue Circle', '🟩 Green Square', '⭐ Gold Star'], correct: [0], timeLimit: 15, points: 1000, explanation: 'The shapes alternate between red triangle and blue circle.' },
        { type: 'tf', text: 'Is 2, 4, 8, 16 a geometric doubling sequence?', options: ['True', 'False'], correct: [0], timeLimit: 12, points: 1000, explanation: 'Each subsequent term is multiplied by 2.' },
        { type: 'mcq', text: 'Next number in sequence: 1, 1, 2, 3, 5, ?', options: ['6', '7', '8', '9'], correct: [2], timeLimit: 15, points: 1000, explanation: 'Fibonacci: each number is the sum of the previous two.' },
        { type: 'fastest', text: '⚡ Fastest Finger: Which number is missing? 3, 6, 9, ?, 15', options: ['10', '11', '12', '14'], correct: [2], timeLimit: 10, points: 1200, explanation: 'Multiples of 3: 3 x 4 = 12.' },
      ],
    },
  },
  {
    id: 'space',
    name: 'Cosmic Space',
    desc: 'Planets, orbits & astrophysics',
    data: {
      title: 'Cosmic Space Odyssey',
      tags: ['space', 'astronomy'],
      ruleset: 'speed',
      questions: [
        { type: 'mcq', text: 'Which planet has the most confirmed moons in our Solar System?', options: ['Jupiter', 'Saturn', 'Mars', 'Neptune'], correct: [1], timeLimit: 15, points: 1000, explanation: 'Saturn holds the official record with 146 confirmed moons.' },
        { type: 'tf', text: 'A day on Venus is longer than a year on Venus.', options: ['True', 'False'], correct: [0], timeLimit: 12, points: 1000, explanation: 'Venus rotates on its axis once every 243 Earth days, but orbits the Sun in 225 days.' },
        { type: 'mcq', text: 'Approximately how long does sunlight take to reach Earth?', options: ['8 seconds', '8 minutes', '8 hours', 'Instant'], correct: [1], timeLimit: 15, points: 1000, explanation: 'Light traveling at 300,000 km/s takes ~8 minutes and 20 seconds.' },
        { type: 'steal', text: '⚔ Steal Round: What is the closest star system to our Solar System?', options: ['Alpha Centauri', 'Sirius', 'Betelgeuse', 'Polaris'], correct: [0], timeLimit: 18, points: 1500, explanation: 'Alpha Centauri (including Proxima Centauri) is ~4.24 light-years away.' },
      ],
    },
  },
  {
    id: 'science',
    name: 'Science & Lab',
    desc: 'Elements, biology & physics',
    data: {
      title: 'Science & Wonder',
      tags: ['science', 'physics', 'biology'],
      ruleset: 'streak',
      questions: [
        { type: 'mcq', text: 'What is the most abundant chemical element in the universe?', options: ['Oxygen', 'Hydrogen', 'Carbon', 'Helium'], correct: [1], timeLimit: 15, points: 1000, explanation: 'Hydrogen accounts for roughly 75% of all baryonic mass.' },
        { type: 'mcq', text: 'What is the powerhouse organelle of the eukaryotic cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi Body'], correct: [2], timeLimit: 12, points: 1000, explanation: 'Mitochondria produce the majority of cellular ATP.' },
        { type: 'tf', text: 'Sound waves travel faster in water than in air.', options: ['True', 'False'], correct: [0], timeLimit: 12, points: 1000, explanation: 'Sound travels roughly 4.3 times faster through water than air.' },
        { type: 'mcq', text: 'What is the atomic number of Gold (Au)?', options: ['47', '74', '79', '82'], correct: [2], timeLimit: 15, points: 1000, explanation: 'Gold has atomic number 79 on the periodic table.' },
      ],
    },
  },
  {
    id: 'history',
    name: 'World History',
    desc: 'Ancient empires & milestones',
    data: {
      title: 'World History & Legends',
      tags: ['history', 'ancient'],
      ruleset: 'speed',
      questions: [
        { type: 'mcq', text: 'Which ancient wonder is the oldest and only one still largely intact?', options: ['Colossus of Rhodes', 'Great Pyramid of Giza', 'Hanging Gardens', 'Lighthouse of Alexandria'], correct: [1], timeLimit: 15, points: 1000, explanation: 'The Great Pyramid of Giza was built circa 2560 BCE.' },
        { type: 'tf', text: 'The Roman Empire fell entirely in 476 CE.', options: ['True', 'False'], correct: [1], timeLimit: 12, points: 1000, explanation: 'The Western Roman Empire fell in 476, but the Eastern Byzantine Empire lasted until 1453 CE.' },
        { type: 'mcq', text: 'In what year did the Apollo 11 Moon landing take place?', options: ['1965', '1969', '1972', '1975'], correct: [1], timeLimit: 15, points: 1000, explanation: 'Apollo 11 landed on the lunar surface on July 20, 1969.' },
      ],
    },
  },
];

export default function Host() {
  const [pass, setPass] = useState('admin123');
  const [activePreset, setActivePreset] = useState<string>('pattern');
  const [json, setJson] = useState(JSON.stringify(PRESETS[0].data, null, 2));
  const [customMode, setCustomMode] = useState(false);
  const [ruleset, setRuleset] = useState<'speed' | 'fastest' | 'classic' | 'streak' | 'lives'>('speed');
  const [errs, setErrs] = useState<string[]>([]);
  const [week, setWeek] = useState('');
  const [copied, setCopied] = useState(false);

  const { state: s, sock, skew } = useGame((so) => {
    const saved = sessionStorage.getItem('ql-host');
    if (saved) {
      try {
        so.emit('host:resume', JSON.parse(saved), (r: any) => {
          if (r?.error) sessionStorage.removeItem('ql-host');
        });
      } catch {}
    }
  });

  useEffect(() => {
    if (!s) return;
    if (s.phase === 'question') sfx.start();
    if (s.phase === 'reveal') sfx.ok();
    if (s.phase === 'final') sfx.win();
  }, [s?.phase, s?.qi]);

  const selectPreset = (pId: string) => {
    setActivePreset(pId);
    setCustomMode(false);
    const found = PRESETS.find((p) => p.id === pId);
    if (found) {
      const qz = { ...found.data, ruleset };
      setJson(JSON.stringify(qz, null, 2));
    }
  };

  const changeRuleset = (r: 'speed' | 'fastest' | 'classic' | 'streak' | 'lives') => {
    setRuleset(r);
    try {
      const parsed = JSON.parse(json);
      parsed.ruleset = r;
      setJson(JSON.stringify(parsed, null, 2));
    } catch {}
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    let quiz: any;
    try {
      quiz = JSON.parse(json);
      quiz.ruleset = ruleset;
    } catch (x) {
      return setErrs(['Not valid JSON: ' + (x as Error).message]);
    }
    sock?.emit(
      'host:create',
      { quiz, passcode: pass, ruleset, week: Number(week) || undefined },
      (r: any) => {
        if (r.error) return setErrs([r.error, ...(r.details ?? [])]);
        sessionStorage.setItem('ql-host', JSON.stringify({ code: r.code, passcode: pass }));
      }
    );
  };

  const copyCode = () => {
    if (!s?.code) return;
    navigator.clipboard.writeText(s.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    sfx.tap();
  };

  const copyLink = () => {
    if (!s?.code || typeof window === 'undefined') return;
    const url = `${window.location.origin}/play/${s.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    sfx.tap();
  };

  if (!s) {
    return (
      <main className="wrap center">
        <Mute />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="crest" aria-hidden style={{ fontSize: '2.5rem' }}>♛</span>
          <span style={{ fontFamily: 'var(--fd), "Cinzel", Georgia, serif', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ac1)' }}>
            Tournament Director
          </span>
        </div>
        <h1 className="logo">Host a Quiz</h1>
        <p style={{ margin: '-10px 0 12px', color: 'var(--ink-muted)' }}>
          Configure match rules, select round questions, and launch real-time room
        </p>

        <form className="card stack" style={{ maxWidth: 720 }} onSubmit={create}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              Host Passcode
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Host passcode (default: admin123)"
              aria-label="Host passcode"
              required
            />
          </div>

          <div style={{ textAlign: 'left', marginTop: '4px' }}>
            <span style={{ fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)', display: 'block', marginBottom: '8px' }}>
              Choose Quiz Deck Preset
            </span>
            <div className="preset-grid">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`preset-btn ${!customMode && activePreset === p.id ? 'active' : ''}`}
                  onClick={() => selectPreset(p.id)}
                >
                  <b>{p.name}</b>
                  <small>{p.desc}</small>
                </button>
              ))}
              <button
                type="button"
                className={`preset-btn ${customMode ? 'active' : ''}`}
                onClick={() => setCustomMode(true)}
              >
                <b>Custom / JSON</b>
                <small>Edit raw quiz data</small>
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'left', marginTop: '4px' }}>
            <span style={{ fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)', display: 'block', marginBottom: '8px' }}>
              Scoring Algorithm &amp; Game Mode
            </span>
            <div className="ruleset-row">
              <button
                type="button"
                className={`ruleset-btn ${ruleset === 'speed' ? 'active' : ''}`}
                onClick={() => changeRuleset('speed')}
              >
                🚀 Kahoot Speed Curve
              </button>
              <button
                type="button"
                className={`ruleset-btn ${ruleset === 'fastest' ? 'active' : ''}`}
                onClick={() => changeRuleset('fastest')}
              >
                ⚡ Fastest Finger
              </button>
              <button
                type="button"
                className={`ruleset-btn ${ruleset === 'classic' ? 'active' : ''}`}
                onClick={() => changeRuleset('classic')}
              >
                🎯 Flat Pub Quiz
              </button>
              <button
                type="button"
                className={`ruleset-btn ${ruleset === 'streak' ? 'active' : ''}`}
                onClick={() => changeRuleset('streak')}
              >
                🔥 Streak Combos
              </button>
              <button
                type="button"
                className={`ruleset-btn ${ruleset === 'lives' ? 'active' : ''}`}
                onClick={() => changeRuleset('lives')}
              >
                🛡️ Survival (3 Lives)
              </button>
            </div>

            <div style={{ marginTop: '10px', padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--line-subtle)', fontSize: '0.88rem', lineHeight: 1.45 }}>
              {ruleset === 'speed' && (
                <span>
                  <b style={{ color: 'var(--ac1)' }}>🚀 Speed Curve:</b> Points scale from 1,000 for immediate answers down to 500 at buzzer expiration. Sub-1.8s reflexes add +100 reflex bonus, plus streak multipliers up to +500!
                </span>
              )}
              {ruleset === 'fastest' && (
                <span>
                  <b style={{ color: 'var(--ac1)' }}>⚡ Fastest Finger Showdown:</b> 🥇 1st quickest correct responder collects 100% question points + <b>500 Jackpot!</b> 🥈 2nd gets 80% + 250, 🥉 3rd gets 65% + 100.
                </span>
              )}
              {ruleset === 'classic' && (
                <span>
                  <b style={{ color: 'var(--ac1)' }}>🎯 Flat Pub Quiz:</b> Classic pub quiz format. Every correct response yields full points (1,000 pts) regardless of timer latency.
                </span>
              )}
              {ruleset === 'streak' && (
                <span>
                  <b style={{ color: 'var(--ac1)' }}>🔥 Multiplier Combos:</b> 1st correct = 1.0x, 2nd = 1.25x, 3rd = 1.5x, 4th = 1.75x, and 5+ = <b>2.0x double points!</b> Incorrect answers break your streak.
                </span>
              )}
              {ruleset === 'lives' && (
                <span>
                  <b style={{ color: 'var(--ac1)' }}>🛡️ Survival Battle:</b> Each team begins with 3 lives. Misses cost 1 life. Surviving on your final life yields a <b>+300 Last Stand bonus!</b>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', marginTop: '4px' }}>
            <label style={{ fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              Week Number (optional, for League Table)
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              placeholder="e.g. 1, 2, 3…"
              aria-label="Week number"
            />
          </div>

          {customMode && (
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              aria-label="Quiz JSON"
              spellCheck={false}
              style={{ minHeight: '180px', marginTop: '6px' }}
            />
          )}

          {errs.length > 0 && (
            <div className="err" role="alert">
              {errs.map((x, i) => (
                <div key={i}>{x}</div>
              ))}
            </div>
          )}

          <button className="btn" type="submit" style={{ marginTop: '10px' }}>
            Open Game Room ➔
          </button>
        </form>

        <Link href="/" className="btn ghost" style={{ textDecoration: 'none', marginTop: '12px' }}>
          Back to Start
        </Link>
      </main>
    );
  }

  const q = s.q;
  const next = () => sock?.emit('host:next');
  const exportCsv = (kind: 'results' | 'answers') =>
    sock?.emit('host:export', null, (r: any) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([r[kind]], { type: 'text/csv;charset=utf-8' }));
      a.download = `${s.code}-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

  return (
    <main className="wrap">
      <Mute />

      {s.phase === 'lobby' && (
        <div className="center stack" style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--fd), "Cinzel", Georgia, serif', fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ac1)' }}>
            Broadcasting Live Lobby
          </span>
          <h1
            className="code"
            style={{ cursor: 'pointer', margin: '4px 0' }}
            onClick={copyCode}
            title="Click to copy room code"
          >
            {s.code}
          </h1>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <button type="button" className="copy-badge" onClick={copyCode}>
              {copied ? '✓ Code Copied' : '📋 Copy Code'}
            </button>
            <button type="button" className="copy-badge" onClick={copyLink}>
              {copied ? '✓ Link Copied' : '🔗 Copy Join Link'}
            </button>
          </div>

          <div className="chips" style={{ minHeight: '44px', margin: '10px 0', maxWidth: '700px' }}>
            {s.names && s.names.length > 0 ? (
              s.names.map((n: string) => (
                <span className="chip" key={n}>
                  {n}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                Waiting for teams to join with room code…
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--ink-muted)', fontSize: '0.92rem', marginBottom: '14px' }}>
            <span><b>{s.playerCount}</b> / {s.max} joined</span>
            <span>·</span>
            <span>{s.title}</span>
            <span>·</span>
            <span style={{ textTransform: 'capitalize' }}>{s.ruleset} Rules</span>
          </div>

          <button className="btn" disabled={!s.playerCount} onClick={next} style={{ marginTop: '8px' }}>
            Start Quiz ({s.playerCount} {s.playerCount === 1 ? 'Team' : 'Teams'}) ➔
          </button>
        </div>
      )}

      {s.phase === 'question' && q && (
        <>
          <div className="row">
            <span style={{ fontSize: '0.95rem', color: 'var(--ink-muted)' }}>
              Question <b style={{ color: '#fff' }}>{s.qi + 1}</b> of {s.total}
            </span>
            <span style={{ fontSize: '0.95rem', color: 'var(--ink-muted)' }}>
              {q.steal ? `${q.steal.open ? '⚡ Steal is open! Owner: ' : 'Owner: '}${q.steal.owner} · ` : ''}
              <b style={{ color: 'var(--ac1)' }}>{s.answered}</b> / {s.playerCount} answered
            </span>
            <Ring endsAt={s.endsAt} total={q.timeLimit} skew={skew.current} paused={s.pausedLeft} />
          </div>

          <h2 className="q-text">{q.text}</h2>
          <Visual v={q.visual} />
          {q.type === 'fastest' && (
            <p style={{ color: 'var(--ac1)', margin: '0' }}>
              ⚡ Fastest finger: first correct answer claims jackpot points
            </p>
          )}

          <div className="opts">
            {q.options.map((o: string, i: number) => (
              <div key={i} className={`opt o${i}`} style={{ animationDelay: `${i * 70}ms` }}>
                <span className="sh">{LETTERS[i]}</span>
                <span className="opt-text">{o}</span>
              </div>
            ))}
          </div>

          {s.paused && <h2 className="big" style={{ textAlign: 'center', margin: '16px 0' }}>⏸ Paused</h2>}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => sock?.emit('host:pause')}>
              {s.paused ? 'Resume Round' : 'Pause Round'}
            </button>
            <button className="btn ghost" onClick={() => sock?.emit('host:reveal')}>
              Reveal Answers
            </button>
            <button className="btn ghost" onClick={() => sock?.emit('host:skip')}>
              Skip Question
            </button>
          </div>
        </>
      )}

      {s.phase === 'reveal' && q && (
        <>
          <div className="row">
            <span style={{ fontSize: '0.95rem', color: 'var(--ink-muted)' }}>
              Question {s.qi + 1} of {s.total} — Results &amp; Distribution
            </span>
          </div>

          <h2 className="q-text">{q.text}</h2>

          <div className="opts">
            {q.options.map((o: string, i: number) => (
              <OptionDistributionBar
                key={i}
                index={i}
                glyph={LETTERS[i]}
                text={o}
                count={q.dist?.[i] ?? 0}
                total={s.answered || s.playerCount}
                isCorrect={q.correct?.includes(i) ?? false}
              />
            ))}
          </div>

          {q.explanation && (
            <div className="card" style={{ maxWidth: '100%', margin: '8px 0', background: 'rgba(255, 255, 255, 0.05)' }}>
              <b style={{ color: 'var(--ac1)' }}>💡 Official Explanation:</b> {q.explanation}
            </div>
          )}

          <div style={{ marginTop: '14px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.25rem', color: 'var(--ac1)' }}>
              Tournament Standings
            </h3>
            <Board rows={s.board ?? []} />
          </div>

          <div style={{ marginTop: '16px' }}>
            <button className="btn" onClick={next}>
              {s.qi + 1 >= s.total ? 'View Final Results 🏆' : 'Next Question ➔'}
            </button>
          </div>
        </>
      )}

      {s.phase === 'final' && (
        <div className="center stack" style={{ alignItems: 'center' }}>
          <Confetti />
          <span style={{ fontFamily: 'var(--fd), "Cinzel", Georgia, serif', fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ac1)' }}>
            Tournament Grand Finale
          </span>
          <h1 className="logo">Final Results</h1>

          <div className="pod">
            {[1, 0, 2].map((i) =>
              s.board?.[i] ? (
                <div key={i} className={`p${i + 1}`}>
                  <span style={{ fontSize: '1.4rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.board[i].name}</b>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{s.board[i].score.toLocaleString()}</span>
                </div>
              ) : null
            )}
          </div>

          <h3 style={{ margin: '16px 0 8px', color: 'var(--ac1)' }}>Full Final Standings</h3>
          <Board rows={s.board ?? []} />

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '18px' }}>
            <button className="btn" onClick={() => exportCsv('results')}>
              Download Leaderboard CSV
            </button>
            <button className="btn ghost" onClick={() => exportCsv('answers')}>
              Download Answers CSV
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                sessionStorage.removeItem('ql-host');
                location.reload();
              }}
            >
              Host Another Quiz
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
