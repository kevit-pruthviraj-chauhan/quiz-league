'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/** Connects once, keeps the latest role-shaped state, and tracks server/client clock skew for timers. */
export function useGame(onConnect: (s: Socket) => void) {
  const [state, setState] = useState<any>(null);
  const [sock, setSock] = useState<Socket | null>(null);
  const skew = useRef(0);
  const cb = useRef(onConnect);
  cb.current = onConnect;
  useEffect(() => {
    const s = io();
    s.on('connect', () => cb.current(s));
    s.on('state', (st) => { skew.current = st.now - Date.now(); setState(st); });
    setSock(s);
    return () => { s.disconnect(); };
  }, []);
  return { state, sock, skew };
}
