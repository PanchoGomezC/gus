import { Easing } from 'remotion';

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const E = {
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  outSoft: Easing.bezier(0.33, 1, 0.68, 1),
  in: Easing.bezier(0.55, 0, 0.9, 0.3),
  smooth: Easing.bezier(0.45, 0, 0.25, 1),
  linear: (x: number) => x,
};

/** Progreso 0..1 entre a y b (segundos), con curva. */
export const prog = (t: number, a: number, b: number, ease: (x: number) => number = E.inOut) =>
  ease(clamp((t - a) / (b - a)));

/** Resorte subamortiguado analítico (determinista), 0 → 1. */
export const spring = (t: number, start: number, opts: { freq?: number; damping?: number } = {}) => {
  const x = t - start;
  if (x <= 0) return 0;
  const w = 2 * Math.PI * (opts.freq ?? 1.6);
  const z = opts.damping ?? 0.62;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * x));
};

/** Ventana de visibilidad con fundido de entrada y salida. */
export const win = (t: number, a: number, b: number, fin = 0.3, fout = 0.3) =>
  Math.min(prog(t, a, a + fin, E.smooth), 1 - prog(t, b - fout, b, E.smooth));

/** Pseudoaleatorio determinista. */
export const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const deg = (d: number) => (d * Math.PI) / 180;
