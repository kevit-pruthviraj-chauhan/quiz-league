'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const api = (path: string, pass: string) => fetch(path, { headers: { 'x-host-pass': pass } });

export default function History() {
  const [pass, setPass] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [league, setLeague] = useState<{ weeks: number[]; teams: any[] } | null>(null);

  async function load(p: string) {
    setErr('');
    try {
      const [a, b] = await Promise.all([api('/api/history', p), api('/api/league', p)]);
      if (!a.ok || !b.ok) { setOk(false); return setErr(a.status === 401 ? 'Wrong passcode' : 'Could not read the database'); }
      sessionStorage.setItem('ql-pass', p);
      setList(await a.json()); setLeague(await b.json()); setOk(true);
    } catch { setErr('Could not reach the server'); }
  }
  useEffect(() => {
    document.body.dataset.skin = 'general';
    const p = sessionStorage.getItem('ql-pass');
    if (p) { setPass(p); load(p); }
  }, []);

  async function download(id: string, kind: string, name: string) {
    const r = await api(`/api/history/${id}?kind=${kind}`, pass);
    if (!r.ok) return setErr('Download failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await r.blob());
    a.download = `${name}-${kind}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!ok) return (
    <main className="wrap center">
      <div className="crest" aria-hidden>♛</div>
      <h1 className="logo">History</h1>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); load(pass); }}>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Host passcode" aria-label="Host passcode" required />
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn">Open history</button>
      </form>
      <Link href="/">Back to start</Link>
    </main>
  );

  return (
    <main className="wrap">
      <h1 className="logo" style={{ textAlign: 'center' }}>League Table</h1>
      {err && <div className="err" role="alert">{err}</div>}
      {league && league.teams.length > 0 ? (
        <div className="scroll"><table className="tbl">
          <thead><tr><th>#</th><th>Team</th>{league.weeks.map((w) => <th key={w}>{w ? `Week ${w}` : 'Untagged'}</th>)}<th>Total</th></tr></thead>
          <tbody>{league.teams.map((t, i) => <tr key={t.name}><td>{i + 1}</td><td>{t.name}</td>{league.weeks.map((w) => <td key={w}>{t.weeks[w] ?? '–'}</td>)}<td><b>{t.total}</b></td></tr>)}</tbody>
        </table></div>
      ) : <p>No finished games yet. Finish a quiz and it will appear here.</p>}
      <h2>Past sessions</h2>
      <div className="stack">
        {list.map((s) => (
          <div className="card hist" key={s.id}>
            <div><b>{s.title}</b><br /><small>{new Date(s.endedAt).toLocaleString()} · {s.teams} teams · {s.theme}{s.week ? ` · Week ${s.week}` : ''}</small></div>
            <div className="chips">
              <button className="btn ghost" onClick={() => download(s.id, 'results', s.code)}>Leaderboard CSV</button>
              <button className="btn ghost" onClick={() => download(s.id, 'answers', s.code)}>Answers CSV</button>
            </div>
          </div>
        ))}
      </div>
      <Link href="/host">Host a quiz</Link>
    </main>
  );
}
