let ctx: AudioContext | undefined;

const muted = () => typeof localStorage !== 'undefined' && localStorage.getItem('ql-mute') === '1';

const getCtx = () => {
  if (typeof window === 'undefined') return undefined;
  ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
};

const tone = (f: number, d: number, t = 0, type: OscillatorType = 'sine', gain = 0.15) => {
  if (muted()) return;
  const c = getCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    o.connect(g);
    g.connect(c.destination);
    const s = c.currentTime + t;
    g.gain.setValueAtTime(gain, s);
    g.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.start(s);
    o.stop(s + d);
  } catch {}
};

export const sfx = {
  tap: () => tone(600, 0.05, 0, 'sine', 0.1),
  tick: () => tone(880, 0.04, 0, 'triangle', 0.12),
  ok: () => {
    tone(523.25, 0.1, 0, 'triangle', 0.14); // C5
    tone(659.25, 0.12, 0.08, 'triangle', 0.15); // E5
    tone(783.99, 0.22, 0.16, 'triangle', 0.16); // G5
  },
  bad: () => {
    tone(220, 0.18, 0, 'sawtooth', 0.1);
    tone(185, 0.25, 0.1, 'sawtooth', 0.08);
  },
  streak: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(f, 0.15, i * 0.07, 'sine', 0.14);
    });
  },
  start: () => {
    tone(440, 0.08, 0, 'triangle', 0.12);
    tone(554.37, 0.09, 0.07, 'triangle', 0.13);
    tone(659.25, 0.2, 0.15, 'triangle', 0.15);
  },
  win: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
      tone(f, 0.28, i * 0.12, 'sine', 0.16);
    });
  },
  clutch: () => {
    tone(783.99, 0.1, 0, 'triangle', 0.15);
    tone(1046.5, 0.2, 0.08, 'sine', 0.18);
  },
};
