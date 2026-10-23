let ctx: AudioContext | undefined;
const muted = () => typeof localStorage !== 'undefined' && localStorage.getItem('ql-mute') === '1';
const tone = (f: number, d: number, t = 0, type: OscillatorType = 'sine') => {
  if (muted()) return;
  ctx ??= new AudioContext();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
  const s = ctx.currentTime + t;
  g.gain.setValueAtTime(0.15, s); g.gain.exponentialRampToValueAtTime(0.001, s + d);
  o.start(s); o.stop(s + d);
};
export const sfx = {
  tap: () => tone(520, 0.08),
  tick: () => tone(900, 0.05, 0, 'square'),
  ok: () => { tone(660, 0.12); tone(880, 0.18, 0.12); },
  bad: () => tone(160, 0.3, 0, 'sawtooth'),
  start: () => { tone(440, 0.1); tone(660, 0.1, 0.1); tone(880, 0.2, 0.2); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, i * 0.14)),
};
