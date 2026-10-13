import React from 'react';
import { C, FONT } from '../theme';
import { E, clamp, lerp, prog, rand, spring } from '../lib/anim';
import type { TL } from '../timeline';

/**
 * ACTOR B — escenas 03 y 04.
 * La línea azul da origen a un documento y una hoja de cálculo sintéticos →
 * ambos se descomponen en ~216 celdas de datos → las celdas forman columnas →
 * las columnas se funden en barras → alrededor nace un dashboard 3D →
 * tres láminas de vidrio (instrucción, contexto, verificación) se superponen →
 * la verificación detecta una barra inconsistente y la corrige → confirmación.
 * Todos los datos son sintéticos e ilustrativos.
 */

// ---------- geometría base (coordenadas de pantalla con el plano sin rotar) ----------
const DOC = { x: 196, y: 890, w: 300, h: 380 };
const SHEET = { x: 556, y: 890, w: 328, h: 380 };
const HORIZON = 1290;
const BASE = 1240; // línea base del gráfico
const ROWS = [5, 7, 6, 9, 8, 14, 11, 12];
const OUTLIER = 5;
const FIXED_ROWS = 9;
const barCx = (i: number) => 225 + 90 * i;
const CELL_W = 22;
const CELL_H = 12;
const PITCH = 16;
const PANEL = { x: 140, y: 640, w: 800, h: 880 };

type Rect = { x: number; y: number; w: number; h: number; col: [number, number, number, number] };

const docSources: Rect[] = [];
for (let k = 0; k < 12; k++)
  for (let j = 0; j < 8; j++)
    docSources.push({ x: DOC.x + 32 + j * 29.5, y: DOC.y + 84 + k * 23, w: 26.5, h: 8, col: [245, 247, 250, j > 5 && k % 3 === 2 ? 0.25 : 0.55] });
const sheetSources: Rect[] = [];
for (let r = 0; r < 15; r++)
  for (let q = 0; q < 8; q++)
    sheetSources.push({
      x: SHEET.x + 20 + q * 36,
      y: SHEET.y + 60 + r * 20.5,
      w: 32,
      h: 15,
      col: q === 0 ? [245, 247, 250, 0.42] : [77, 163, 255, 0.16 + 0.32 * rand(r * 8 + q)],
    });
const sources = [...docSources, ...sheetSources].sort((a, b) => a.x - b.x || a.y - b.y);

const targets: Rect[] = [];
ROWS.forEach((rows, i) => {
  for (let q = 0; q < 3; q++)
    for (let r = rows - 1; r >= 0; r--) {
      const f = r / 13;
      targets.push({
        x: barCx(i) - 37 + q * 26,
        y: BASE - (r + 1) * PITCH + 4,
        w: CELL_W,
        h: CELL_H,
        col: [lerp(13, 77, f), lerp(71, 163, f), lerp(161, 255, f), 0.95],
      });
    }
});
// targets ya está en orden columna a columna, de arriba abajo; igual que sources.

const LINE_VALUES = [0.35, 0.42, 0.38, 0.5, 0.47, 0.58, 0.55, 0.66, 0.7, 0.78];

const fmt = (v: number, dec: number) => v.toFixed(dec).replace('.', ',');
const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const Kpi: React.FC<{ x: number; label: string; value: string; o: number; z: number; accent?: number }> = ({ x, label, value, o, z, accent = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: 724,
      width: 216,
      height: 150,
      borderRadius: 24,
      boxSizing: 'border-box',
      background: 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
      border: `1.5px solid rgba(${lerp(245, 255, accent)},${lerp(247, 176, accent)},${lerp(250, 33, accent)},${0.12 + 0.5 * accent})`,
      opacity: o,
      transform: `translateZ(${z}px)`,
      fontFamily: FONT,
    }}
  >
    <div style={{ position: 'absolute', left: 24, top: 22, fontSize: 22, fontWeight: 500, color: 'rgba(245,247,250,0.6)', letterSpacing: '0.02em' }}>{label}</div>
    <div style={{ position: 'absolute', left: 22, top: 62, fontSize: 44, fontWeight: 700, color: C.white, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{value}</div>
  </div>
);

export const DataToDashboard: React.FC<{ t: number; T: TL }> = ({ t, T }) => {
  const c = T.cues;
  if (t < T.s3 + 0.5 || t > T.s5 + 0.8) return null;

  const birth = prog(t, c.birth[0], c.birth[1], E.out);
  const dec0 = c.decompose[0];
  const decomposing = t >= dec0;
  const frameFade = 1 - prog(t, dec0 + 0.15, dec0 + 0.75, E.smooth);
  const flatten = prog(t, c.birth[1] - 0.15, dec0, E.inOut);

  // ---------- línea → línea base ----------
  const toBase = prog(t, c.fuse[0] - 0.25, c.fuse[0] + 0.25, E.inOut);
  const lineY = lerp(HORIZON, BASE, toBase);
  const lx0 = lerp(120, 180, toBase);
  const lx1 = lerp(960, 900, toBase);

  // ---------- cámara del dashboard ----------
  const tiltA = prog(t, c.fuse[1], T.s4, E.inOut);
  const tiltB = prog(t, T.s4, T.s5, E.inOut);
  const exit = prog(t, T.s5, T.s5 + 0.6, E.in);
  const rx = lerp(0, 16, tiltA) + lerp(0, 8, tiltB) + lerp(0, 18, exit);
  const ry = lerp(0, -12, tiltA) + lerp(0, 30, tiltB);
  const sc = lerp(1, 0.94, tiltA) * lerp(1, 0.93, tiltB) * lerp(1, 0.72, exit);
  const ty = lerp(0, 24, tiltB);
  const fade = 1 - exit;
  const depth = tiltA; // separación de capas (parallax)

  // ---------- panel ----------
  const panel = prog(t, c.panel[0], c.panel[1], E.out);
  const kpiIn = (k: number) => prog(t, c.panel[0] + 0.25 + k * 0.1, c.panel[0] + 0.75 + k * 0.1, E.out);
  const count = prog(t, c.panel[0] + 0.3, c.panel[1] + 0.3, E.out);
  const fuse = prog(t, c.fuse[0], c.fuse[1], E.smooth);
  const lineDraw = prog(t, c.fuse[1] - 0.1, c.fuse[1] + 0.8, E.inOut);

  // ---------- verificación ----------
  const scanU = prog(t, c.scan[0], c.scan[1], E.smooth);
  const scanOn = t >= c.scan[0] - 0.05 && t <= c.scan[1] + 0.25;
  const scanX = lerp(150, 930, scanU);
  const detectAt = c.scan[0] + (c.scan[1] - c.scan[0]) * 0.66;
  const flag = prog(t, detectAt, detectAt + 0.25, E.out);
  const corr = clamp(spring(t, c.correct[0], { freq: 1.5, damping: 0.7 }), 0, 1.08);
  const fixed = prog(t, c.correct[0], c.correct[1], E.smooth);
  const outlierRows = lerp(ROWS[OUTLIER], FIXED_ROWS, corr);
  const gold = flag * (1 - fixed);
  const kpiFix = prog(t, c.correct[0] + 0.15, c.correct[1], E.smooth);

  const kpiDim = lerp(1, 0.28, prog(t, c.sheets[0], c.sheets[0] + 0.6, E.smooth));
  const revenue = lerp(0, 12.4, count);
  const revenueFixed = 9.8;

  // ---------- partículas ----------
  const particles: React.ReactNode[] = [];
  if (decomposing && t < c.fuse[1] + 0.05) {
    const N = sources.length;
    const pOpacity = 1 - fuse;
    for (let i = 0; i < N; i++) {
      const s = sources[i];
      const g = targets[i];
      const delay = 0.42 * (i / N) + 0.06 * rand(i + 3);
      const u = prog(t, dec0 + delay, dec0 + delay + 0.8, E.inOut);
      const sx = s.x + s.w / 2, sy = s.y + s.h / 2;
      const gx = g.x + g.w / 2, gy = g.y + g.h / 2;
      const c1x = sx + (rand(i) - 0.5) * 90, c1y = sy - 60 - 70 * rand(i + 7);
      const c2x = gx + (rand(i + 11) - 0.5) * 30, c2y = gy - 150 - 60 * rand(i + 5);
      const m = 1 - u;
      const x = m * m * m * sx + 3 * m * m * u * c1x + 3 * m * u * u * c2x + u * u * u * gx;
      const y = m * m * m * sy + 3 * m * m * u * c1y + 3 * m * u * u * c2y + u * u * u * gy;
      const w = lerp(s.w, g.w, u);
      const h = lerp(s.h, g.h, u);
      const col = s.col.map((v, k) => lerp(v, g.col[k], u));
      particles.push(
        <rect
          key={i}
          x={x - w / 2}
          y={y - h / 2}
          width={w}
          height={h}
          rx={lerp(2, 3, u)}
          fill={`rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${col[3] * pOpacity})`}
          transform={`rotate(${Math.sin(u * Math.PI) * (rand(i + 9) - 0.5) * 50} ${x} ${y})`}
        />,
      );
    }
  }

  // ---------- documento y hoja ----------
  const rise = lerp(420, 0, birth);
  const docObj = (
    <div
      style={{
        position: 'absolute',
        left: DOC.x,
        top: DOC.y,
        width: DOC.w,
        height: DOC.h,
        borderRadius: 26,
        boxSizing: 'border-box',
        background: 'linear-gradient(165deg, rgba(255,255,255,0.10), rgba(255,255,255,0.025))',
        border: '1.5px solid rgba(245,247,250,0.22)',
        transform: `translateY(${rise}px) rotateY(${lerp(14, 0, flatten)}deg)`,
        opacity: frameFade,
      }}
    >
      <div style={{ position: 'absolute', left: 32, top: 40, width: 150, height: 12, borderRadius: 6, background: 'rgba(245,247,250,0.75)' }} />
      {!decomposing &&
        docSources.map((s, i) => (
          <div key={i} style={{ position: 'absolute', left: s.x - DOC.x, top: s.y - DOC.y, width: s.w, height: s.h, borderRadius: 2, background: `rgba(245,247,250,${s.col[3]})` }} />
        ))}
    </div>
  );
  const sheetObj = (
    <div
      style={{
        position: 'absolute',
        left: SHEET.x,
        top: SHEET.y,
        width: SHEET.w,
        height: SHEET.h,
        borderRadius: 26,
        boxSizing: 'border-box',
        background: 'linear-gradient(165deg, rgba(255,255,255,0.10), rgba(255,255,255,0.025))',
        border: '1.5px solid rgba(245,247,250,0.22)',
        transform: `translateY(${rise * 1.08}px) rotateY(${lerp(-14, 0, flatten)}deg)`,
        opacity: frameFade,
      }}
    >
      {Array.from({ length: 8 }, (_, q) => (
        <div key={q} style={{ position: 'absolute', left: 20 + q * 36, top: 26, width: 32, height: 16, borderRadius: 3, background: 'rgba(77,163,255,0.55)' }} />
      ))}
      {!decomposing &&
        sheetSources.map((s, i) => (
          <div key={i} style={{ position: 'absolute', left: s.x - SHEET.x, top: s.y - SHEET.y, width: s.w, height: s.h, borderRadius: 2, background: `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${s.col[3]})` }} />
        ))}
    </div>
  );

  // ---------- barras sólidas ----------
  const bars = ROWS.map((rows, i) => {
    const r = i === OUTLIER ? outlierRows : rows;
    const h = r * PITCH - 4;
    const hi = scanOn ? Math.exp(-(((scanX - barCx(i)) / 34) ** 2)) : 0;
    const isOut = i === OUTLIER;
    const goldMix = isOut ? gold : 0;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: barCx(i) - 37,
          top: BASE - h,
          width: 74,
          height: h,
          borderRadius: '10px 10px 3px 3px',
          background: `linear-gradient(180deg, rgba(${lerp(77, 255, goldMix) | 0},${lerp(163, 176, goldMix) | 0},${lerp(255, 33, goldMix) | 0},1) 0%, rgba(${lerp(13, 160, goldMix) | 0},${lerp(71, 100, goldMix) | 0},${lerp(161, 20, goldMix) | 0},1) 100%)`,
          boxShadow: `0 0 ${18 + 30 * hi}px rgba(77,163,255,${0.15 + 0.4 * hi})`,
          outline: `${1.5 + hi}px solid rgba(245,247,250,${0.15 + 0.7 * hi})`,
          outlineOffset: 3,
          opacity: fuse * fade,
          transform: `translateZ(${34 * depth}px)`,
        }}
      />
    );
  });

  const outlierTop = BASE - outlierRows * PITCH + 4;

  // ---------- láminas de vidrio ----------
  const sheetDefs = [
    { label: 'INSTRUCCIÓN', z: 330, at: c.sheets[0], idx: '01' },
    { label: 'CONTEXTO', z: 200, at: c.sheets[1], idx: '02' },
    { label: 'VERIFICACIÓN', z: 70, at: c.sheets[2], idx: '03' },
  ];

  const linePts = LINE_VALUES.map((v, j) => [180 + j * 80, 1460 - v * 150] as const);
  const linePath = linePts.map((p, j) => `${j ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${linePath} L900 1470 L180 1470 Z`;

  return (
    <>
      {/* Documento y hoja: nacen de la línea */}
      {t < dec0 + 0.8 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: HORIZON - 2, overflow: 'hidden', perspective: 1400, perspectiveOrigin: '540px 1080px' }}>
          {docObj}
          {sheetObj}
        </div>
      )}

      {/* Dashboard 3D */}
      <div style={{ position: 'absolute', inset: 0, perspective: 1800, perspectiveOrigin: '540px 1080px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transformOrigin: '540px 1080px',
            transform: `translateY(${ty}px) scale(${sc}) rotateX(${rx}deg) rotateY(${ry}deg)`,
          }}
        >
          {/* base del panel */}
          <div
            style={{
              position: 'absolute',
              left: PANEL.x,
              top: PANEL.y,
              width: PANEL.w,
              height: PANEL.h,
              borderRadius: 44,
              boxSizing: 'border-box',
              background: 'linear-gradient(165deg, rgba(255,255,255,0.075), rgba(255,255,255,0.018) 55%, rgba(255,255,255,0.03))',
              border: '1.5px solid rgba(245,247,250,0.16)',
              boxShadow: '0 40px 120px rgba(0,0,0,0.45)',
              opacity: panel * fade,
              transform: `scale(${lerp(0.96, 1, panel)})`,
              transformOrigin: '540px 1240px',
            }}
          >
            <div style={{ position: 'absolute', left: 40, top: 30, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: C.light }} />
              <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(245,247,250,0.85)' }}>Panel ejecutivo</div>
            </div>
            <div style={{ position: 'absolute', right: 40, top: 34, fontFamily: FONT, fontSize: 17, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(245,247,250,0.5)' }}>
              DATOS ILUSTRATIVOS
            </div>
          </div>

          {/* KPIs */}
          <Kpi
            x={180}
            label="Ingresos"
            value={kpiFix > 0.5 ? `+${fmt(revenueFixed, 1)} %` : `+${fmt(revenue, 1)} %`}
            o={kpiIn(0) * fade * (kpiFix > 0 ? Math.abs(kpiFix - 0.5) * 2 : 1) * lerp(kpiDim, 1, Math.max(flag, kpiFix > 0 ? 1 : 0))}
            z={26 * depth}
            accent={gold * 0.8}
          />
          <Kpi x={432} label="Margen" value={`${fmt(lerp(0, 38.2, count), 1)} %`} o={kpiIn(1) * fade * kpiDim} z={26 * depth} />
          <Kpi x={684} label="Clientes" value={thousands(Math.round(lerp(0, 1284, count)))} o={kpiIn(2) * fade * kpiDim} z={26 * depth} />

          {/* gráfico: rejilla + línea base + barras + tendencia */}
          <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translateZ(${8 * depth}px)` }}>
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.light} stopOpacity={0.28} />
                <stop offset="100%" stopColor={C.light} stopOpacity={0} />
              </linearGradient>
            </defs>
            {[1, 2, 3].map((k) => (
              <line key={k} x1={180} x2={900} y1={BASE - 64 * k} y2={BASE - 64 * k} stroke="rgba(245,247,250,0.07)" strokeWidth={1.5} opacity={panel * fade} />
            ))}
            <line x1={lx0} y1={lineY} x2={lx1} y2={lineY} stroke={C.light} strokeWidth={14} strokeOpacity={0.14 * fade} strokeLinecap="round" />
            <line x1={lx0} y1={lineY} x2={lx1} y2={lineY} stroke={C.light} strokeWidth={3} strokeLinecap="round" opacity={fade} />
            <path d={areaPath} fill="url(#area)" opacity={lineDraw * fade} style={{ clipPath: `inset(0 ${100 - lineDraw * 100}% 0 0)` }} />
            <path d={linePath} fill="none" stroke={C.light} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${lineDraw} 1`} opacity={fade} />
            {linePts.map((p, j) => (
              <circle key={j} cx={p[0]} cy={p[1]} r={5} fill={C.white} opacity={clamp(lineDraw * 10 - j) * fade * 0.9} />
            ))}
          </svg>

          {bars}

          {/* marca de inconsistencia */}
          <div
            style={{
              position: 'absolute',
              left: barCx(OUTLIER) - 19,
              top: outlierTop - 58,
              width: 38,
              height: 38,
              borderRadius: 19,
              background: C.gold,
              color: C.bg,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: flag * (1 - prog(t, c.correct[1] - 0.1, c.correct[1] + 0.2)) * fade,
              transform: `translateZ(${60 * depth}px) scale(${lerp(0.4, 1, spring(t, detectAt, { freq: 2.4, damping: 0.5 }))})`,
            }}
          >
            !
          </div>

          {/* láminas de vidrio */}
          {sheetDefs.map((d, k) => {
            const inP = prog(t, d.at, d.at + 0.7, E.out);
            if (inP <= 0) return null;
            const isVerif = k === 2;
            const sheen = clamp((t - d.at - 0.2) / 0.9);
            return (
              <div
                key={d.label}
                style={{
                  position: 'absolute',
                  left: 150,
                  top: 1000,
                  width: 780,
                  height: 270,
                  borderRadius: 28,
                  boxSizing: 'border-box',
                  background: `linear-gradient(120deg, rgba(255,255,255,0) ${lerp(-40, 120, sheen) - 12}%, rgba(255,255,255,0.10) ${lerp(-40, 120, sheen)}%, rgba(255,255,255,0) ${lerp(-40, 120, sheen) + 12}%), linear-gradient(140deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 60%)`,
                  border: `1.5px solid ${isVerif ? 'rgba(77,163,255,0.65)' : 'rgba(245,247,250,0.30)'}`,
                  opacity: inP * fade,
                  transform: `translateZ(${d.z}px) translateX(${lerp(760, 0, inP)}px)`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 26,
                    top: 18,
                    fontFamily: FONT,
                    fontSize: 23,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    color: isVerif ? C.light : 'rgba(245,247,250,0.82)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ opacity: 0.55, marginRight: 14 }}>{d.idx}</span>
                  {d.label}
                </div>
                {isVerif && scanOn && (
                  <div
                    style={{
                      position: 'absolute',
                      left: scanX - 150 - 60,
                      top: 0,
                      width: 120,
                      height: 270,
                      background: 'linear-gradient(90deg, rgba(77,163,255,0) 0%, rgba(77,163,255,0.22) 85%, rgba(200,230,255,0.9) 98%, rgba(77,163,255,0) 100%)',
                      opacity: 1 - prog(t, c.scan[1], c.scan[1] + 0.25),
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Partículas en espacio de pantalla (el plano está plano durante el vuelo) */}
      {particles.length > 0 && (
        <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
          {particles}
        </svg>
      )}
    </>
  );
};
