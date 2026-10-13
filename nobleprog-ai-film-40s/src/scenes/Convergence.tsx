import React from 'react';
import { C, CX, FONT } from '../theme';
import { E, clamp, deg, lerp, prog } from '../lib/anim';
import { circlePts, depthRuns, lerpPts, project, ptsToPath, rotX, rotY, roundRectPts, squarePts, trianglePts } from '../lib/proj';
import type { TL } from '../timeline';

/**
 * ACTOR D — escenas 07 y 08 (geometría).
 * La tarjeta de decisión se comprime en un triángulo; nacen un cuadrado y un círculo:
 * CLAUDE (estructura) · AGENTES (ciclo) · CHATGPT (dirección).
 * Se conectan, convergen al centro, se transforman en tres anillos y giran
 * en 3D hasta formar una única geometría suspendida en el espacio.
 */
const N = 120;
const GY = 1060;
const SHAPES = [
  { name: 'CLAUDE', x: 270, y: GY, color: [77, 163, 255], fill: 'rgba(16,30,52,0.96)', alpha: -60 },
  { name: 'AGENTES', x: 540, y: GY, color: [245, 247, 250], fill: 'rgba(22,27,38,0.96)', alpha: 0 },
  { name: 'CHATGPT', x: 810, y: GY + 14, color: [255, 176, 33], fill: 'rgba(40,32,16,0.96)', alpha: 60 },
];
const RING_R = 230;

const square = squarePts(N, 74);
const circle = circlePts(N, 86);
const tri = trianglePts(N, 104);
const ring = circlePts(N, RING_R);
const base = [square, circle, tri];

export const Convergence: React.FC<{ t: number; T: TL }> = ({ t, T }) => {
  const c = T.cues;
  const start = T.s7 + 0.3;
  if (t < start) return null;

  const p8end = T.phrases[7].end;
  // la tarjeta se compacta en su sitio y luego viaja a la derecha convirtiéndose en triángulo
  const shrink = prog(t, start, start + 0.45, E.inOut);
  const morph = prog(t, start + 0.35, start + 0.95, E.inOut);
  const growAt = (k: number) => prog(t, start + 0.4 + (k === 1 ? 0.2 : 0), start + 1.0 + (k === 1 ? 0.2 : 0), E.out);
  const labels = prog(t, start + 0.5, start + 1.1, E.out) * (1 - prog(t, c.converge[0], c.converge[0] + 0.3, E.smooth));
  const link = prog(t, c.connect[0], c.connect[1], E.inOut) * (1 - prog(t, c.converge[0], c.converge[0] + 0.4, E.smooth));
  const conv = prog(t, c.converge[0], c.converge[1], E.inOut);
  const u3d = prog(t, c.converge[0] + 0.35, c.converge[1] + 0.45, E.inOut);
  const spin = deg(150) * E.outSoft(prog(t, c.converge[0] + 0.35, T.END + 0.4));
  const tilt = deg(-18) * u3d;
  const pull = lerp(1, 0.86, prog(t, c.converge[1], T.s8 + 0.6, E.smooth));
  const up = prog(t, p8end + 0.05, T.s8 + 0.9, E.inOut);
  const gScale = pull * lerp(1, 0.58, up);
  const gx = CX;
  const gy = lerp(GY, 760, up);
  const gAlpha = lerp(1, 0.78, up);

  const els: React.ReactNode[] = [];

  // Línea de conexión (detrás de las figuras)
  if (link > 0) {
    els.push(
      <g key="link" opacity={1}>
        <line x1={150} y1={GY} x2={150 + 780 * link} y2={GY} stroke={C.light} strokeWidth={12} strokeOpacity={0.14} strokeLinecap="round" />
        <line x1={150} y1={GY} x2={150 + 780 * link} y2={GY} stroke={C.light} strokeWidth={2.5} strokeLinecap="round" />
      </g>,
    );
  }

  // Núcleo de luz al converger
  if (u3d > 0) {
    els.push(<circle key="core" cx={gx} cy={gy} r={200 * gScale} fill="url(#coreGlow)" opacity={u3d * gAlpha} />);
    els.push(<circle key="dot" cx={gx} cy={gy} r={7 * gScale + 2} fill="#ffffff" opacity={u3d * gAlpha} />);
  }

  SHAPES.forEach((sh, k) => {
    // contorno 2D en el estado actual
    let pts = base[k];
    let cx = sh.x;
    let cy = sh.y;
    let scale = 1;
    const grow = growAt(k);
    if (k === 2) {
      const card = roundRectPts(N, lerp(800, 176, shrink), lerp(720, 176, shrink), lerp(38, 44, shrink));
      pts = lerpPts(card, tri, morph);
      cx = lerp(CX, sh.x, morph);
      cy = lerp(lerp(1100, GY, shrink), sh.y, morph);
    } else {
      scale = grow;
    }
    pts = lerpPts(pts, ring, conv);
    cx = lerp(cx, CX, conv);
    cy = lerp(cy, GY, conv);

    const [r, g, b] = sh.color;
    if (u3d <= 0.001) {
      // plano: un único trazo
      const strokeA = k === 2 ? lerp(0.85, 1, morph) : grow;
      const sw = k === 2 ? lerp(1.5, 3, morph) : 3;
      const fillO = (1 - prog(t, c.converge[0], c.converge[0] + 0.3, E.smooth)) * (k === 2 ? 1 : grow);
      const fill = k === 2 && morph < 1 ? `rgba(${lerp(30, 40, morph) | 0},${lerp(33, 32, morph) | 0},${lerp(42, 16, morph) | 0},${lerp(0.5, 0.96, morph)})` : sh.fill;
      els.push(
        <path
          key={`s${k}`}
          d={ptsToPath(pts.map((p) => [p[0] * scale, p[1] * scale]), cx, cy)}
          fill={fill}
          fillOpacity={fillO}
          stroke={`rgba(${r},${g},${b},${strokeA})`}
          strokeWidth={sw}
          strokeLinejoin="round"
        />,
      );
    } else {
      // 3D: anillo inclinado con opacidad por profundidad
      const a = deg(sh.alpha) * u3d;
      const P = pts.map((p) => {
        let v: [number, number, number] = [p[0], p[1], 0];
        v = rotY(v, a);
        v = rotX(v, tilt);
        v = rotY(v, spin);
        return v;
      });
      const Q = P.map((p) => {
        const q = project([p[0] * gScale, p[1] * gScale, p[2] * gScale], gx, gy + (cy - GY), 1500);
        return { x: q.x + (cx - CX), y: q.y };
      });
      const frontAt = (i: number) => clamp(0.5 - (P[i][2] + P[(i + 1) % N][2]) / 2 / (2 * RING_R));
      depthRuns(Q, frontAt, true, 12).forEach((run, j) => {
        els.push(
          <path
            key={`r${k}_${j}`}
            d={run.d}
            fill="none"
            stroke={`rgba(${r},${g},${b},${lerp(1, lerp(0.22, 1, run.a), u3d) * gAlpha})`}
            strokeWidth={lerp(3, lerp(2, 3.6, run.a), u3d) * lerp(1, 0.8, up)}
            strokeLinecap="butt"
            strokeLinejoin="round"
          />,
        );
      });
    }
  });

  return (
    <>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="rgba(255,236,200,0.55)" />
            <stop offset="25%" stopColor="rgba(120,185,255,0.22)" />
            <stop offset="100%" stopColor="rgba(77,163,255,0)" />
          </radialGradient>
        </defs>
        {els}
      </svg>
      {labels > 0 &&
        SHAPES.map((sh, k) => (
          <div
            key={sh.name}
            style={{
              position: 'absolute',
              left: sh.x - 170,
              width: 340,
              top: 1196,
              height: 50,
              overflow: 'hidden',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 30,
                lineHeight: '50px',
                letterSpacing: '0.16em',
                color: C.white,
                opacity: labels,
                transform: `translateY(${lerp(100, 0, prog(t, start + 0.5 + k * 0.08, start + 1.1 + k * 0.08, E.out))}%) translateX(${30 * 0.08}px)`,
              }}
            >
              {sh.name}
            </div>
          </div>
        ))}
    </>
  );
};
