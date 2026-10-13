import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';
import metrics from './fontMetrics.json';

export const C = {
  bg: '#0A0D14',
  blue: '#0D47A1',
  light: '#4DA3FF',
  white: '#F5F7FA',
  gold: '#FFB021',
  ink: '#121826',
  line: 'rgba(245,247,250,0.16)',
};

export const W = 1080;
export const H = 1920;
// Centro del escenario visual (debajo del bloque tipográfico superior).
export const CX = 540;
export const CY = 1080;

export const FONT = 'Montserrat';
for (const w of ['400', '500', '600', '700', '800']) {
  loadFont({
    family: FONT,
    url: staticFile(`assets/fonts/montserrat-latin-${w}-normal.woff2`),
    weight: w,
  });
}

type Weight = 500 | 600 | 700 | 800;
const M = metrics as unknown as Record<string, Record<string, number>>;

/** Ancho tipográfico exacto (px) a partir de las métricas reales de Montserrat. */
export const textWidth = (s: string, weight: Weight, size: number, trackingEm = 0) => {
  const table = M[String(weight)];
  let w = 0;
  for (const ch of s) w += table[ch] ?? 0.62;
  return (w + trackingEm * Math.max(0, [...s].length - 1)) * size;
};

export const fitSize = (s: string, weight: Weight, maxW: number, maxSize: number, trackingEm = 0) =>
  Math.min(maxSize, maxW / textWidth(s, weight, 1, trackingEm));
