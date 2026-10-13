// Mini motor 3D para SVG: rotaciones y proyección en perspectiva.
// Convención: +z se aleja de la cámara.
export type V3 = [number, number, number];

export const rotX = ([x, y, z]: V3, a: number): V3 => [
  x,
  y * Math.cos(a) - z * Math.sin(a),
  y * Math.sin(a) + z * Math.cos(a),
];
export const rotY = ([x, y, z]: V3, a: number): V3 => [
  x * Math.cos(a) + z * Math.sin(a),
  y,
  -x * Math.sin(a) + z * Math.cos(a),
];
export const rotZ = ([x, y, z]: V3, a: number): V3 => [
  x * Math.cos(a) - y * Math.sin(a),
  x * Math.sin(a) + y * Math.cos(a),
  z,
];

export type P2 = { x: number; y: number; s: number; z: number };

export const project = (p: V3, cx: number, cy: number, f = 1500): P2 => {
  const s = f / (f + p[2]);
  return { x: cx + p[0] * s, y: cy + p[1] * s, s, z: p[2] };
};

export const lerp3 = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// Muestreadores de contorno con N puntos, empezando arriba y en sentido horario.
// Permiten morphing continuo entre figuras (cuadrado ↔ círculo ↔ triángulo).
export const circlePts = (n: number, r: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [r * Math.sin(a), -r * Math.cos(a)];
  });

const polyPts = (n: number, verts: [number, number][]): [number, number][] => {
  const segs = verts.map((v, i) => {
    const w = verts[(i + 1) % verts.length];
    return { a: v, b: w, len: Math.hypot(w[0] - v[0], w[1] - v[1]) };
  });
  const total = segs.reduce((s, x) => s + x.len, 0);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * total;
    for (const s of segs) {
      if (d <= s.len) {
        const u = d / s.len;
        out.push([s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u]);
        break;
      }
      d -= s.len;
    }
  }
  return out;
};

export const squarePts = (n: number, h: number) =>
  // empieza en el centro del lado superior para alinearse con circlePts
  polyPts(n, [
    [0, -h],
    [h, -h],
    [h, h],
    [-h, h],
    [-h, -h],
  ]);

export const trianglePts = (n: number, r: number) =>
  polyPts(n, [0, 1, 2].map((k) => {
    const a = (k / 3) * Math.PI * 2;
    return [r * Math.sin(a), -r * Math.cos(a)] as [number, number];
  }));

export const roundRectPts = (n: number, w: number, h: number, r: number): [number, number][] => {
  // contorno de rectángulo redondeado (centrado), empezando arriba-centro
  const pts: [number, number][] = [];
  const hw = w / 2, hh = h / 2;
  const rr = Math.min(r, hw, hh);
  const straightW = w - 2 * rr, straightH = h - 2 * rr;
  const arc = (Math.PI / 2) * rr;
  const per = 2 * straightW + 2 * straightH + 4 * arc;
  for (let i = 0; i < n; i++) {
    let d = ((i / n) * per + straightW / 2) % per; // desplazado para empezar arriba-centro
    const segs: [number, (u: number) => [number, number]][] = [
      [straightW, (u) => [-hw + rr + u * straightW, -hh]],
      [arc, (u) => { const a = -Math.PI / 2 + u * (Math.PI / 2); return [hw - rr + rr * Math.cos(a), -hh + rr + rr * Math.sin(a)]; }],
      [straightH, (u) => [hw, -hh + rr + u * straightH]],
      [arc, (u) => { const a = u * (Math.PI / 2); return [hw - rr + rr * Math.cos(a), hh - rr + rr * Math.sin(a)]; }],
      [straightW, (u) => [hw - rr - u * straightW, hh]],
      [arc, (u) => { const a = Math.PI / 2 + u * (Math.PI / 2); return [-hw + rr + rr * Math.cos(a), hh - rr + rr * Math.sin(a)]; }],
      [straightH, (u) => [-hw, hh - rr - u * straightH]],
      [arc, (u) => { const a = Math.PI + u * (Math.PI / 2); return [-hw + rr + rr * Math.cos(a), -hh + rr + rr * Math.sin(a)]; }],
    ];
    for (const [len, f] of segs) {
      if (d <= len || len === 0) {
        pts.push(f(len === 0 ? 0 : d / len));
        break;
      }
      d -= len;
    }
  }
  return pts;
};

export const ptsToPath = (pts: [number, number][], cx = 0, cy = 0) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${(p[0] + cx).toFixed(2)} ${(p[1] + cy).toFixed(2)}`).join(' ') + 'Z';

export const lerpPts = (a: [number, number][], b: [number, number][], t: number): [number, number][] =>
  a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);

/**
 * Agrupa un contorno proyectado en tramos continuos de opacidad similar.
 * Evita el efecto «cuentas» de dibujar segmentos sueltos con extremos redondeados
 * cuando la opacidad es parcial. Devuelve un path por tramo.
 */
export const depthRuns = (
  pts: { x: number; y: number }[],
  alpha: (i: number) => number,
  closed = true,
  levels = 14,
  count = pts.length,
): { d: string; a: number }[] => {
  const runs: { d: string; a: number }[] = [];
  const segs = closed ? count : count - 1;
  let cur: { pts: string[]; q: number } | null = null;
  for (let i = 0; i < segs; i++) {
    const q = Math.round(Math.max(0, Math.min(1, alpha(i))) * levels);
    const p0 = pts[i];
    const p1 = pts[(i + 1) % pts.length];
    if (!cur || cur.q !== q) {
      if (cur) runs.push({ d: cur.pts.join(' '), a: cur.q / levels });
      cur = { pts: [`M${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`], q };
    }
    cur.pts.push(`L${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`);
  }
  if (cur) runs.push({ d: cur.pts.join(' '), a: cur.q / levels });
  return runs;
};
