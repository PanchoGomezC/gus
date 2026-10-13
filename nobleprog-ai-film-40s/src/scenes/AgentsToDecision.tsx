import React from 'react';
import { C, CX, CY, FONT } from '../theme';
import { E, clamp, deg, lerp, prog, spring } from '../lib/anim';
import { depthRuns, project, rotX, rotY } from '../lib/proj';
import type { V3 } from '../lib/proj';
import type { TL } from '../timeline';

/**
 * ACTOR C — confirmación (fin de 04), escenas 05 y 06.
 * El símbolo de verificación se convierte en el nodo central de un agente →
 * seis nodos se despliegan en un anillo 3D → una señal recorre el ciclo
 * (objetivo → planificación → herramientas → acción → verificación → memoria)
 * y vuelve al centro al terminar una tarea verificable →
 * los nodos se reordenan en tres tarjetas (decidir, delegar, revisar) →
 * la complejidad se reduce a un único insight priorizado.
 */
const R = 320;
const NODES = ['OBJETIVO', 'PLANIFICACIÓN', 'HERRAMIENTAS', 'ACCIÓN', 'VERIFICACIÓN', 'MEMORIA'];
const CARDS = [
  { title: 'DECIDIR', idx: '01' },
  { title: 'DELEGAR', idx: '02' },
  { title: 'REVISAR', idx: '03' },
];
const CARD_Y = [830, 1070, 1310];
const CARD_W = 800;
const CARD_H = 190;
const FOCUS_Y = 1100;
const FOCUS_H = 720;
// Matriz de priorización (datos ilustrativos): x = riesgo, y = impacto
const DOTS: [number, number][] = [
  [0.22, 0.82], // prioridad
  [0.7, 0.76],
  [0.86, 0.4],
  [0.4, 0.3],
  [0.62, 0.55],
  [0.14, 0.24],
  [0.9, 0.86],
  [0.32, 0.56],
  [0.55, 0.14],
];

const MiniViz: React.FC<{ k: number; o: number }> = ({ k, o }) => {
  const st = { fill: 'none', stroke: 'rgba(245,247,250,0.55)', strokeWidth: 2, strokeLinecap: 'round' as const };
  return (
    <svg width={150} height={110} viewBox="0 0 150 110" style={{ position: 'absolute', right: 44, top: 40, opacity: o }}>
      {k === 0 && (
        <g>
          <path d="M10 6 V100 H144" {...st} />
          <path d="M77 6 V100 M10 53 H144" {...st} stroke="rgba(245,247,250,0.18)" strokeDasharray="4 5" />
          {[[0.7, 0.75], [0.85, 0.35], [0.4, 0.3], [0.6, 0.55]].map(([x, y], i) => (
            <circle key={i} cx={10 + x * 134} cy={100 - y * 94} r={4.5} fill="rgba(245,247,250,0.5)" />
          ))}
          <circle cx={10 + 0.22 * 134} cy={100 - 0.82 * 94} r={7} fill={C.gold} />
        </g>
      )}
      {k === 1 && (
        <g>
          <circle cx={26} cy={55} r={14} {...st} />
          <circle cx={124} cy={55} r={14} {...st} stroke={C.light} />
          <path d="M48 55 H98 M88 45 L99 55 L88 65" {...st} />
        </g>
      )}
      {k === 2 && (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M12 ${24 + i * 32} l6 6 l11 -12`} {...st} stroke={C.light} />
              <path d={`M46 ${24 + i * 32} H${138 - i * 22}`} {...st} />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
};

export const AgentsToDecision: React.FC<{ t: number; T: TL }> = ({ t, T }) => {
  const c = T.cues;
  if (t < c.check - 0.02 || t > T.s7 + 0.32) return null;

  // ---------- cámara del anillo ----------
  const tiltAt = (time: number) => deg(lerp(0, 58, prog(time, T.s5 + 1.0, T.s5 + 2.7, E.inOut)));
  const yawAt = (time: number) => deg(lerp(-8, 16, prog(time, T.s5 + 0.8, T.s6 + 0.6, E.smooth)));
  const place = (p: V3, time: number) => project(rotY(rotX(p, -tiltAt(time)), yawAt(time)), CX, CY, 1500);
  const deployAt = (i: number, time: number) => prog(time, c.deploy[0] + 0.06 * i, c.deploy[1] + 0.06 * i, E.out);
  const nodeBase = (i: number, rho = 1): V3 => {
    const a = (i / 6) * Math.PI * 2;
    return [rho * R * Math.sin(a), -rho * R * Math.cos(a), 0];
  };
  const nodeAt = (i: number, time: number) => place(nodeBase(i, deployAt(i, time)), time);

  // ---------- señal ----------
  const sig = c.signal;
  const A1 = sig + c.signalSpoke;
  const B1 = A1 + c.signalLoop;
  const C1 = B1 + c.signalSpoke;
  const signalPos = (time: number): { x: number; y: number; s: number } | null => {
    if (time < sig || time > C1) return null;
    if (time < A1) {
      const u = prog(time, sig, A1, E.inOut);
      const b = nodeBase(0);
      return place([b[0] * u, b[1] * u, 0], time);
    }
    if (time < B1) {
      const a = ((time - A1) / (B1 - A1)) * Math.PI * 2;
      return place([R * Math.sin(a), -R * Math.cos(a), 0], time);
    }
    const u = 1 - prog(time, B1, C1, E.inOut);
    const b = nodeBase(0);
    return place([b[0] * u, b[1] * u, 0], time);
  };

  // ---------- fases ----------
  const badgePop = clamp(spring(t, c.check, { freq: 1.8, damping: 0.55 }), 0, 1.2);
  const checkDraw = prog(t, c.check + 0.08, c.check + 0.45, E.out) * (1 - prog(t, T.s5, T.s5 + 0.4, E.in));
  const toNode = prog(t, T.s5, T.s5 + 0.55, E.inOut);
  const reorg = prog(t, T.s6, T.s6 + 0.6, E.inOut);
  const ringFade = 1 - prog(t, T.s6, T.s6 + 0.4, E.smooth);
  const labelFade = 1 - prog(t, T.s6, T.s6 + 0.25, E.smooth);
  const done = prog(t, C1, C1 + 0.35, E.out);

  const centerR = lerp(66, 44, toNode) * badgePop * (1 - prog(t, T.s6, T.s6 + 0.5, E.in));
  const svgEls: React.ReactNode[] = [];

  // Halo central
  svgEls.push(
    <circle key="halo" cx={CX} cy={CY} r={centerR * 2.6} fill="url(#halo)" opacity={0.8 + 0.6 * Math.exp(-Math.max(0, t - C1) * 3) * (t > C1 ? 1 : 0)} />,
  );

  const frozen = Math.min(t, T.s6); // la geometría 3D se congela al reordenar
  if (t >= c.deploy[0] && ringFade > 0) {
    // Anillo con opacidad según profundidad
    const draw = prog(t, c.deploy[0] + 0.15, c.deploy[1] + 0.25, E.inOut);
    const ringRho = prog(t, c.deploy[0], c.deploy[1], E.out);
    const N = 120;
    const n = Math.floor(N * draw);
    const ringPts = Array.from({ length: N + 1 }, (_, k) => {
      const a = (k / N) * Math.PI * 2;
      return place([ringRho * R * Math.sin(a), -ringRho * R * Math.cos(a), 0], frozen);
    });
    const frontAt = (k: number) => clamp(0.5 - (ringPts[k].z + ringPts[k + 1].z) / 2 / (2 * R));
    if (n > 0)
      depthRuns(ringPts, frontAt, false, 10, n + 1).forEach((run, j) => {
        svgEls.push(
          <path key={`r${j}`} d={run.d} fill="none" stroke={C.white} strokeOpacity={lerp(0.12, 0.42, run.a) * ringFade} strokeWidth={2} strokeLinecap="butt" strokeLinejoin="round" />,
        );
      });
    // radio hacia el objetivo
    const n0 = nodeAt(0, frozen);
    svgEls.push(
      <line key="spoke" x1={CX} y1={CY} x2={n0.x} y2={n0.y} stroke={C.light} strokeOpacity={0.4 * deployAt(0, t) * ringFade} strokeWidth={2} strokeDasharray="3 7" strokeLinecap="round" />,
    );
  }

  // Señal con estela
  for (let k = 12; k >= 0; k--) {
    const p = signalPos(t - k * 0.022);
    if (!p) continue;
    const f = 1 - k / 13;
    svgEls.push(<circle key={`s${k}`} cx={p.x} cy={p.y} r={lerp(2, 8, f) * p.s} fill={k === 0 ? '#ffffff' : C.light} opacity={k === 0 ? 1 : 0.55 * f} />);
  }
  const head = signalPos(t);
  if (head) svgEls.push(<circle key="glow" cx={head.x} cy={head.y} r={30} fill="url(#halo)" opacity={0.9} />);

  // Nodos
  const nodeEls: React.ReactNode[] = [];
  const labelEls: React.ReactNode[] = [];
  if (t >= c.deploy[0]) {
    NODES.forEach((name, i) => {
      const d = deployAt(i, t);
      if (d <= 0) return;
      const p3 = nodeAt(i, frozen);
      const tgt = { x: CX, y: CARD_Y[Math.floor(i / 2)] };
      const x = lerp(p3.x, tgt.x, reorg);
      const y = lerp(p3.y, tgt.y, reorg);
      const s = lerp(p3.s, 1, reorg);
      const ti = c.signalNodes[i];
      const act = prog(t, ti, ti + 0.25, E.out);
      const flash = t > ti ? Math.exp(-(t - ti) * 4) : 0;
      const ripple = prog(t, ti, ti + 0.7, E.out);
      const r = 24 * s * (1 + 0.18 * flash);
      const front = clamp(0.5 - p3.z / (2 * R));
      if (reorg < 1) {
        nodeEls.push(
          <g key={`n${i}`}>
            {t > ti && ripple < 1 && <circle cx={x} cy={y} r={r * lerp(1, 2.6, ripple)} fill="none" stroke={C.light} strokeWidth={2} opacity={(1 - ripple) * 0.8} />}
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={`rgb(${lerp(16, 13, act) | 0},${lerp(22, 71, act) | 0},${lerp(36, 161, act) | 0})`}
              stroke={act > 0 ? `rgba(120,185,255,${0.6 + 0.4 * flash})` : 'rgba(245,247,250,0.55)'}
              strokeWidth={2.2}
            />
            <circle cx={x} cy={y} r={r * 0.32} fill={C.white} opacity={0.35 + 0.65 * act} />
          </g>,
        );
      }
      // etiqueta
      const above = nodeBase(i)[1] < 0;
      const fs = 27 * clamp(p3.s, 0.85, 1.1);
      labelEls.push(
        <div
          key={`l${i}`}
          style={{
            position: 'absolute',
            left: x - 200,
            width: 400,
            top: above ? y - r - 18 - fs * 1.2 : y + r + 16,
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: fs,
            letterSpacing: '0.14em',
            color: act > 0.5 ? C.white : 'rgba(245,247,250,0.8)',
            textShadow: '0 0 10px #0A0D14, 0 0 4px #0A0D14, 0 0 2px #0A0D14',
            opacity: d * (0.55 + 0.45 * front) * labelFade * (0.75 + 0.25 * act),
            transform: `translateY(${lerp(above ? 8 : -8, 0, d)}px) translateX(${fs * 0.07}px)`,
          }}
        >
          {name}
        </div>,
      );
    });
  }

  // Insignia de verificación → nodo central
  const checkLen = 1;
  const centerEl = centerR > 0.5 && (
    <g key="center">
      {t < c.check + 0.8 && <circle cx={CX} cy={CY} r={66 * lerp(1, 2.2, prog(t, c.check, c.check + 0.8, E.out))} fill="none" stroke={C.light} strokeWidth={2} opacity={1 - prog(t, c.check, c.check + 0.8)} />}
      {t > C1 && t < C1 + 0.9 && <circle cx={CX} cy={CY} r={44 * lerp(1, 3, prog(t, C1, C1 + 0.9, E.out))} fill="none" stroke={C.white} strokeWidth={2} opacity={1 - prog(t, C1, C1 + 0.9)} />}
      <circle cx={CX} cy={CY} r={centerR} fill={C.blue} stroke={C.light} strokeWidth={3} />
      {checkDraw > 0.002 && <path
        d={`M${CX - 26} ${CY + 2} L${CX - 8} ${CY + 20} L${CX + 28} ${CY - 18}`}
        fill="none"
        stroke={C.white}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={checkLen}
        strokeDasharray={`${checkDraw} 2`}
        transform={`translate(${CX} ${CY}) scale(${centerR / 66}) translate(${-CX} ${-CY})`}
      />}
      <circle cx={CX} cy={CY} r={9 * toNode * (1 - done)} fill={C.white} />
      {done > 0.002 && <path
        d={`M${CX - 15} ${CY + 1} L${CX - 4} ${CY + 12} L${CX + 17} ${CY - 11}`}
        fill="none"
        stroke={C.white}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${done} 2`}
      />}
    </g>
  );

  // ---------- tarjetas ----------
  const cardEls: React.ReactNode[] = [];
  const hl = prog(t, c.highlight, c.highlight + 0.5, E.out);
  const focus = prog(t, c.focus[0], c.focus[1], E.inOut);
  const exitContent = 1 - prog(t, T.s7, T.s7 + 0.3, E.smooth);
  if (t >= T.s6 + 0.6) {
    CARDS.forEach((cd, k) => {
      const m = prog(t, T.s6 + 0.6 + 0.08 * k, T.s6 + 1.25 + 0.08 * k, E.inOut);
      const contentIn = prog(t, T.s6 + 1.0 + 0.08 * k, T.s6 + 1.45 + 0.08 * k, E.out);
      const isMain = k === 0;
      const w = lerp(48, CARD_W, m);
      let h = lerp(48, CARD_H, m);
      let cy = CARD_Y[k];
      let z = 0;
      let o = 1;
      let blur = 0;
      if (isMain) {
        h = lerp(h, FOCUS_H, focus);
        cy = lerp(cy, FOCUS_Y, focus);
      } else {
        const dim = hl;
        z = lerp(0, -140, dim) + lerp(0, -260, focus);
        o = lerp(1, 0.38, dim) * (1 - prog(t, c.focus[0] + 0.2, c.focus[1] - 0.2, E.smooth));
        blur = lerp(0, 3, dim) + lerp(0, 5, focus);
        cy = cy + lerp(0, 140 * (k === 1 ? 1 : 1.6), focus);
      }
      if (o <= 0.001) return;
      const goldA = isMain ? hl : 0;
      const radius = lerp(24, 38, m);
      const matrixIn = isMain ? prog(t, c.focus[1] - 0.35, c.focus[1] + 0.45, E.out) : 0;
      const risk = isMain ? prog(t, c.risk, c.risk + 0.6, E.smooth) : 0;
      const pri = isMain ? prog(t, c.priority, c.priority + 0.5, E.out) : 0;
      const priSpring = isMain ? clamp(spring(t, c.priority, { freq: 1.6, damping: 0.5 }), 0, 1.3) : 0;
      const zoom = lerp(1, 1.1, prog(t, c.priority, c.priority + 1.6, E.smooth));
      const MX = 64, MY = 214, MW = 672, MH = 426;
      const gold = { x: MX + DOTS[0][0] * MW, y: MY + MH - DOTS[0][1] * MH };
      cardEls.push(
        <div
          key={cd.title}
          style={{
            position: 'absolute',
            left: CX - w / 2,
            top: cy - h / 2,
            width: w,
            height: h,
            borderRadius: radius,
            boxSizing: 'border-box',
            background: `linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025)), rgba(13,71,161,${1 - prog(m, 0.05, 0.6, E.smooth)})`,
            border: `${lerp(2.2, 1.5, m)}px solid rgba(${lerp(245, 255, goldA) | 0},${lerp(247, 176, goldA) | 0},${lerp(250, 33, goldA) | 0},${lerp(0.18, 0.85, goldA) * lerp(1, 0.9, goldA)})`,
            boxShadow: isMain ? `0 0 ${90 * hl}px rgba(255,176,33,${0.13 * hl * exitContent})` : 'none',
            transform: `translateZ(${z}px)`,
            filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
            opacity: o,
            overflow: 'hidden',
          }}
        >
          <div style={{ opacity: contentIn * exitContent }}>
            <div
              style={{
                position: 'absolute',
                left: 48,
                top: 42,
                fontFamily: FONT,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: goldA > 0.5 ? C.gold : C.light,
              }}
            >
              {cd.idx}
            </div>
            <div
              style={{
                position: 'absolute',
                left: 46,
                top: 76,
                fontFamily: FONT,
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: '0.01em',
                color: C.white,
                transform: `translateY(${lerp(14, 0, contentIn)}px)`,
              }}
            >
              {cd.title}
            </div>
            <MiniViz k={k} o={(1 - matrixIn) * 1} />
            {isMain && matrixIn > 0 && (
              <svg width={CARD_W} height={FOCUS_H} style={{ position: 'absolute', left: 0, top: 0, opacity: matrixIn }}>
                <g transform={`translate(${gold.x} ${gold.y}) scale(${zoom}) translate(${-gold.x} ${-gold.y})`}>
                  {/* zona de riesgo */}
                  <rect x={MX + MW / 2} y={MY} width={MW / 2} height={MH} fill={C.light} opacity={0.08 * risk * (1 - 0.6 * pri)} />
                  <path d={`M${MX} ${MY} V${MY + MH} H${MX + MW}`} fill="none" stroke="rgba(245,247,250,0.55)" strokeWidth={2} />
                  <path d={`M${MX + MW / 2} ${MY} V${MY + MH} M${MX} ${MY + MH / 2} H${MX + MW}`} fill="none" stroke="rgba(245,247,250,0.16)" strokeWidth={1.5} strokeDasharray="5 8" />
                  {DOTS.slice(1).map(([dx, dy], i) => {
                    const x = MX + dx * MW, y = MY + MH - dy * MH;
                    const pop = prog(t, c.focus[1] - 0.1 + i * 0.05, c.focus[1] + 0.25 + i * 0.05, E.out);
                    const risky = dx > 0.5;
                    return (
                      <g key={i} opacity={pop * lerp(1, 0.16, pri)}>
                        {risky && <circle cx={x} cy={y} r={lerp(9, 19, risk)} fill="none" stroke={C.light} strokeWidth={1.5} opacity={risk * 0.8} />}
                        <circle cx={x} cy={y} r={9} fill="rgba(245,247,250,0.62)" />
                      </g>
                    );
                  })}
                  {/* prioridad */}
                  <circle cx={gold.x} cy={gold.y} r={lerp(9, 20, priSpring) * prog(t, c.focus[1] - 0.1, c.focus[1] + 0.25, E.out)} fill={pri > 0 ? C.gold : 'rgba(245,247,250,0.62)'} />
                  {pri > 0 && (
                    <circle cx={gold.x} cy={gold.y} r={lerp(20, 70, prog(t, c.priority, c.priority + 1.0, E.out))} fill="none" stroke={C.gold} strokeWidth={2} opacity={1 - prog(t, c.priority, c.priority + 1.0)} />
                  )}
                  <text x={gold.x + 38} y={gold.y + 10} fontFamily={FONT} fontWeight={700} fontSize={30} letterSpacing="0.16em" fill={C.gold} opacity={pri}>
                    PRIORIDAD
                  </text>
                </g>
                <text x={MX} y={MY - 20} fontFamily={FONT} fontWeight={600} fontSize={24} letterSpacing="0.2em" fill="rgba(245,247,250,0.75)">
                  IMPACTO
                </text>
                <text x={MX + MW} y={MY + MH + 46} textAnchor="end" fontFamily={FONT} fontWeight={600} fontSize={24} letterSpacing="0.2em" fill={risk > 0.5 ? C.light : 'rgba(245,247,250,0.75)'}>
                  RIESGO
                </text>
              </svg>
            )}
          </div>
        </div>,
      );
    });
  }

  return (
    <>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <radialGradient id="halo">
            <stop offset="0%" stopColor="rgba(120,185,255,0.55)" />
            <stop offset="40%" stopColor="rgba(77,163,255,0.18)" />
            <stop offset="100%" stopColor="rgba(77,163,255,0)" />
          </radialGradient>
        </defs>
        {svgEls}
        {nodeEls}
        {centerEl}
      </svg>
      {labelEls}
      <div style={{ position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: `${CX}px ${CY}px` }}>{cardEls}</div>
    </>
  );
};
