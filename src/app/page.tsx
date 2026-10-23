'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const r = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ql-name', name.trim());
    r.push(`/play/${code.trim().toUpperCase()}`);
  };
  return (
    <main className="wrap center">
      <div className="crest" aria-hidden>♛</div>
      <h1 className="logo">Quiz League</h1>
      <form className="card stack" onSubmit={go}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Room code" maxLength={6} autoCapitalize="characters" aria-label="Room code" required />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" maxLength={24} aria-label="Team name" required />
        <button className="btn">Join game</button>
      </form>
      <div className="chips"><Link href="/host">Host a quiz</Link><Link href="/history">History &amp; League table</Link></div>
    </main>
  );
}
