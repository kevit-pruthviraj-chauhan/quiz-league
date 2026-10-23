'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sfx } from '../lib/sfx';
import { Mute } from '../components/bits';

export default function Home() {
  const r = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('ql-name');
    if (savedName) setName(savedName);
  }, []);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    sfx.tap();
    localStorage.setItem('ql-name', name.trim());
    r.push(`/play/${code.trim().toUpperCase()}`);
  };

  return (
    <main className="wrap center">
      <Mute />

      {/* Arena Crest & Emblem */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(248, 223, 141, 0.22), rgba(197, 151, 56, 0.08))',
            border: '1px solid var(--line-strong)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 0 24px rgba(248, 223, 141, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
          }}
        >
          <span className="crest" aria-hidden style={{ fontSize: '2.4rem' }}>♛</span>
        </div>
        <span
          style={{
            fontFamily: 'var(--fd), "Cinzel", Georgia, serif',
            fontSize: '0.8rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ac1)',
            opacity: 0.9,
          }}
        >
          Championship Trivia Arena
        </span>
      </div>

      <h1 className="logo">Quiz League</h1>
      <p
        style={{
          margin: '-12px 0 8px',
          color: 'var(--ink-muted)',
          fontSize: '1.05rem',
          fontWeight: 600,
          maxWidth: '520px',
          lineHeight: 1.45,
        }}
      >
        Real-time competitive pub quiz &amp; multiplayer tournament showdowns
      </p>

      {/* Join Match Form Card */}
      <form className="card stack" onSubmit={go}>
        <div style={{ borderBottom: '1px solid var(--line-subtle)', paddingBottom: '12px', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.15rem', margin: '0 0 4px', color: 'var(--ac1)' }}>
            Join Live Match
          </h2>
          <span style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
            Enter the 6-character room code broadcast by your host
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
          <label htmlFor="room-code-input" style={{ fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            Room Code
          </label>
          <input
            id="room-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7K9X2B"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            style={{
              letterSpacing: '0.2em',
              fontWeight: 800,
              textAlign: 'center',
              fontSize: '1.35rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            }}
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
          <label htmlFor="team-name-input" style={{ fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            Team / Player Name
          </label>
          <input
            id="team-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Oxford Thinkers"
            maxLength={24}
            autoComplete="off"
            required
          />
        </div>

        <button className="btn" type="submit" style={{ marginTop: '8px' }}>
          Enter Battle Arena ➔
        </button>
      </form>

      {/* Unboxed Metadata Features Ticker (Zero-Pill Rule) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem',
          color: 'var(--ink-muted)',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '4px',
        }}
      >
        <span>⚡ Kahoot Speed Curve</span>
        <span aria-hidden style={{ color: 'var(--ac1)', opacity: 0.6 }}>·</span>
        <span>🔥 Streak Multipliers</span>
        <span aria-hidden style={{ color: 'var(--ac1)', opacity: 0.6 }}>·</span>
        <span>📈 D3 Performance Charts</span>
        <span aria-hidden style={{ color: 'var(--ac1)', opacity: 0.6 }}>·</span>
        <span>📊 Official League Standings</span>
      </div>

      {/* Direct Host & League Table Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
        <Link href="/host" className="btn ghost" style={{ textDecoration: 'none' }}>
          👑 Host a Quiz Game
        </Link>
        <Link href="/history" className="btn ghost" style={{ textDecoration: 'none' }}>
          📜 Season League Table
        </Link>
      </div>
    </main>
  );
}
