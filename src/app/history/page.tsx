'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sfx } from '../../lib/sfx';
import { Mute } from '../../components/bits';

const api = (path: string, pass: string) => fetch(path, { headers: { 'x-host-pass': pass } });

export default function History() {
  const [pass, setPass] = useState('admin123');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [league, setLeague] = useState<{ weeks: number[]; teams: any[] } | null>(null);

  async function load(p: string) {
    setErr('');
    try {
      const [a, b] = await Promise.all([api('/api/history', p), api('/api/league', p)]);
      if (!a.ok || !b.ok) {
        setOk(false);
        return setErr(a.status === 401 ? 'Wrong passcode' : 'Could not read database records');
      }
      sessionStorage.setItem('ql-pass', p);
      setList(await a.json());
      setLeague(await b.json());
      setOk(true);
      sfx.ok();
    } catch {
      setErr('Could not reach server endpoint');
    }
  }

  useEffect(() => {
    const p = sessionStorage.getItem('ql-pass') || 'admin123';
    if (p) {
      setPass(p);
      load(p);
    }
  }, []);

  async function download(id: string, kind: string, name: string) {
    sfx.tap();
    const r = await api(`/api/history/${id}?kind=${kind}`, pass);
    if (!r.ok) return setErr('Download failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await r.blob());
    a.download = `${name}-${kind}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!ok) {
    return (
      <main className="wrap center">
        <Mute />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="crest" aria-hidden style={{ fontSize: '2.5rem' }}>♛</span>
          <span style={{ fontFamily: 'var(--fd), "Cinzel", Georgia, serif', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ac1)' }}>
            Official Archive Vault
          </span>
        </div>
        <h1 className="logo">Quiz History</h1>
        <p style={{ margin: '-10px 0 14px', color: 'var(--ink-muted)' }}>
          Enter host passcode to access archives, cumulative league tables &amp; CSV records
        </p>

        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            load(pass);
          }}
        >
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
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn" type="submit">
            Unlock League Archives ➔
          </button>
        </form>

        <Link href="/" className="btn ghost" style={{ textDecoration: 'none', marginTop: '12px' }}>
          Back to Start
        </Link>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Mute />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--line-subtle)', paddingBottom: '16px' }}>
        <div>
          <span style={{ fontFamily: 'var(--fd), "Cinzel", Georgia, serif', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ac1)' }}>
            Championship Standings
          </span>
          <h1 className="logo" style={{ fontSize: '2.5rem', margin: '2px 0 0' }}>
            League Table
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/host" className="btn ghost" style={{ textDecoration: 'none', padding: '10px 20px', fontSize: '0.88rem' }}>
            Host Quiz
          </Link>
          <Link href="/" className="btn ghost" style={{ textDecoration: 'none', padding: '10px 20px', fontSize: '0.88rem' }}>
            Player View
          </Link>
        </div>
      </div>

      {err && <div className="err" role="alert">{err}</div>}

      {league && league.teams.length > 0 ? (
        <div className="scroll card" style={{ maxWidth: '100%', padding: '18px 22px' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '44px' }}>#</th>
                <th>Team Name</th>
                {league.weeks.map((w) => (
                  <th key={w}>{w ? `Week ${w}` : 'Untagged'}</th>
                ))}
                <th style={{ textAlign: 'right' }}>Total Points</th>
              </tr>
            </thead>
            <tbody>
              {league.teams.map((t, i) => {
                const isGold = i === 0;
                const isSilver = i === 1;
                const isBronze = i === 2;
                return (
                  <tr key={t.name}>
                    <td style={{ fontWeight: 800, color: isGold ? 'var(--ac1)' : isSilver ? '#cbd5e1' : isBronze ? '#f59e0b' : 'var(--ink-muted)' }}>
                      {i + 1}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isGold && '🥇'}
                        {isSilver && '🥈'}
                        {isBronze && '🥉'}
                        <span>{t.name}</span>
                      </span>
                    </td>
                    {league.weeks.map((w) => (
                      <td key={w} style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-muted)' }}>
                        {t.weeks[w] ? t.weeks[w].toLocaleString() : '–'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <b style={{ color: 'var(--ac1)', fontSize: '1.05rem' }}>{t.total.toLocaleString()}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: '100%', textAlign: 'center', color: 'var(--ink-muted)' }}>
          <p style={{ margin: 0 }}>No completed games recorded yet. Once a game finishes, cumulative scores calculate here.</p>
        </div>
      )}

      <h2 style={{ margin: '28px 0 12px', fontSize: '1.6rem', color: 'var(--ac1)' }}>
        Past Quiz Sessions
      </h2>
      <div className="stack">
        {list.length > 0 ? (
          list.map((s) => (
            <div className="card hist" key={s.id}>
              <div>
                <b style={{ fontSize: '1.15rem', color: '#ffffff' }}>{s.title}</b>
                <div style={{ marginTop: '4px', fontSize: '0.86rem', color: 'var(--ink-muted)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span>{new Date(s.endedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>·</span>
                  <span>{s.teams} {s.teams === 1 ? 'team' : 'teams'}</span>
                  {s.week ? (
                    <>
                      <span>·</span>
                      <span>Week {s.week}</span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span style={{ textTransform: 'capitalize' }}>{s.ruleset} rules</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => download(s.id, 'results', s.code)}>
                  📊 Leaderboard CSV
                </button>
                <button type="button" className="btn ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => download(s.id, 'answers', s.code)}>
                  📝 Answers CSV
                </button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--ink-muted)' }}>No past sessions archived yet.</p>
        )}
      </div>
    </main>
  );
}
