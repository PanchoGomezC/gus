import React from 'react';
import { C, FONT, textWidth } from '../theme';
import { E, clamp, lerp, prog, spring } from '../lib/anim';
import type { TL } from '../timeline';

/**
 * ACTOR A — escenas 01 y 02.
 * Cursor → caja de conversación → instrucción → respuesta →
 * los caracteres se compactan en un objeto sólido → el objeto se pliega
 * en cuatro módulos → una línea azul los conecta → la cámara revela la estructura.
 */
const PX = 540;
const PY = 1000;
const BOX_W = 820;
const BOX_H = 128;
const TEXT_X = PX - BOX_W / 2 + 58;
const FONT_SIZE = 46;
const DEPTH = 12; // capas de extrusión
const STEP = 3; // px entre capas

const Icon: React.FC<{ i: number; o: number }> = ({ i, o }) => {
  const s = { fill: 'none', stroke: C.white, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={44} height={44} viewBox="0 0 44 44" style={{ opacity: o }}>
      {i === 0 && (
        <g {...s}>
          <path d="M10 13 H34 M10 22 H34 M10 31 H26" />
        </g>
      )}
      {i === 1 && (
        <g fill={C.white}>
          {[0, 1, 2].flatMap((r) => [0, 1, 2].map((q) => <rect key={`${r}${q}`} x={9 + q * 10} y={9 + r * 10} width={6} height={6} rx={1.5} opacity={0.5 + 0.25 * ((r + q) % 3)} />))}
        </g>
      )}
      {i === 2 && (
        <g {...s}>
          <circle cx={22} cy={22} r={12} />
          <circle cx={22} cy={10} r={3} fill={C.white} />
        </g>
      )}
      {i === 3 && (
        <g {...s}>
          <path d="M11 23 L19 31 L34 14" />
        </g>
      )}
    </svg>
  );
};

export const PromptToSystem: React.FC<{ t: number; T: TL }> = ({ t, T }) => {
  const c = T.cues;
  if (t > T.s3 + 0.7) return null;

  // ---------- cámara ----------
  const push = prog(t, 0.3, T.s2, E.smooth);
  const back = prog(t, T.s2, T.s3, E.inOut);
  const scale = lerp(1, 1.1, push) * lerp(1, 1 / 1.1, back);
  const flat = prog(t, T.s3, T.s3 + 0.55, E.inOut);
  const rx = (lerp(0, 12, prog(t, c.compact[0], T.s2, E.inOut)) + lerp(0, 22, prog(t, T.s2 + 0.2, T.s3, E.inOut))) * (1 - flat);
  const ry = lerp(0, -18, prog(t, T.s2 + 0.2, T.s3, E.inOut)) * (1 - flat);

  // ---------- caja ----------
  const box = prog(t, c.boxDraw[0], c.boxDraw[1], E.inOut);
  const comp = prog(t, c.compact[0] + 0.3, c.compact[1], E.inOut);
  const solid = prog(t, c.compact[0] + 0.45, c.compact[1], E.smooth);
  const boxW = lerp(BOX_W, 560, comp);
  const boxH = lerp(BOX_H, 112, comp);

  // ---------- cursor ----------
  const typed = clamp(Math.floor((t - c.typeStart) / c.typeStep) + 1, 0, T.prompt.length);
  const typedW = textWidth(T.prompt.slice(0, typed), 500, FONT_SIZE);
  const cursorX = t < c.typeStart ? lerp(PX, TEXT_X, prog(t, c.boxDraw[0] + 0.1, c.boxDraw[1], E.inOut)) : TEXT_X + typedW + 4;
  const typing = t >= c.typeStart && t <= c.typeEnd + 0.1;
  const blinkPhase = (t % 1.0) / 1.0;
  const blink = typing ? 1 : 0.5 + 0.5 * Math.cos(blinkPhase * Math.PI * 2) > 0.35 ? 1 : 0.12;
  const cursorO = (t < 0.0 ? 0 : 1) * (1 - prog(t, c.compact[0], c.compact[0] + 0.25)) * blink;

  // ---------- módulos (escena 02) ----------
  const split = prog(t, c.split[0], c.split[1], E.inOut);
  const glass = prog(t, c.split[0] + 0.35, c.split[1] + 0.25, E.smooth);
  const sink = prog(t, T.s3, T.s3 + 0.5, E.in); // los módulos se funden en la línea
  const showModules = t >= T.s2;
  const line = prog(t, c.lineDraw[0], c.lineDraw[1], E.inOut);
  const lineY = lerp(PY, 1290, prog(t, T.s3 + 0.05, T.s3 + 0.55, E.inOut));

  const charEls: React.ReactNode[] = [];
  let acc = 0;
  [...T.prompt].forEach((ch, i) => {
    const w = textWidth(ch, 500, FONT_SIZE);
    const x = TEXT_X + acc;
    acc += w;
    const at = c.typeStart + i * c.typeStep;
    const a = prog(t, at, at + 0.14, E.out);
    // compactación: cada carácter viaja al centro y se aplana
    const k = Math.abs(i / (T.prompt.length - 1) - 0.5) * 2;
    const cp = prog(t, c.compact[0] + (1 - k) * 0.18, c.compact[0] + 0.5 + (1 - k) * 0.18, E.in);
    charEls.push(
      <span
        key={i}
        style={{
          position: 'absolute',
          left: lerp(x, PX - w / 2, cp),
          top: PY - FONT_SIZE * 0.66,
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: FONT_SIZE,
          lineHeight: `${FONT_SIZE * 1.3}px`,
          color: C.white,
          opacity: a * (1 - cp) ** 2.2,
          transform: `translateY(${lerp(10, 0, a)}px) scaleX(${1 - cp * 0.9})`,
          whiteSpace: 'pre',
        }}
      >
        {ch}
      </span>,
    );
  });

  // respuesta
  const ans = prog(t, c.answer[0], c.answer[0] + 0.45, E.out);
  const ansC = prog(t, c.compact[0] + 0.12, c.compact[0] + 0.6, E.in);
  const bars = [620, 540, 360];

  const modules = [0, 1, 2, 3].map((i) => {
    const cx0 = PX + (i - 1.5) * 140;
    const cx1 = PX + (i - 1.5) * 178;
    const w = lerp(140, 116, split);
    const h = lerp(112, 116, split);
    const cx = lerp(cx0, cx1, split);
    const outer = 56;
    const r = (edge: boolean) => lerp(edge ? outer : 0, 28, split);
    const tl = r(i === 0), bl = r(i === 0), tr = r(i === 3), br = r(i === 3);
    const radius = `${tl}px ${tr}px ${br}px ${bl}px`;
    const isBlue = i === 0;
    const pop = spring(t, c.split[0] + 0.1 + i * 0.05, { freq: 2.2, damping: 0.55 });
    const zLift = lerp(0, 18, glass) * (isBlue ? 1.6 : 1) * (0.6 + 0.4 * pop);
    const sc = (1 - sink) * 1;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: cx - w / 2,
          top: PY - h / 2 + lerp(0, lineY - PY, 0),
          width: w,
          height: h,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${zLift}px) scale(${sc})`,
          opacity: 1 - prog(t, T.s3 + 0.2, T.s3 + 0.5),
        }}
      >
        {/* extrusión: anillos de borde apilados → canto de vidrio */}
        {Array.from({ length: DEPTH }, (_, k) => (
          <div
            key={k}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: radius,
              transform: `translateZ(${-(k + 1) * STEP}px)`,
              background: `rgba(200,206,216,${(1 - glass) * 0.95})`,
              border: `1.5px solid ${isBlue ? `rgba(77,163,255,${0.12 + 0.25 * glass})` : `rgba(245,247,250,${0.06 + 0.12 * glass})`}`,
              boxSizing: 'border-box',
            }}
          />
        ))}
        {/* cara frontal */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            boxSizing: 'border-box',
            background: isBlue
              ? `linear-gradient(150deg, rgba(77,163,255,${0.55 * glass}) 0%, rgba(13,71,161,${0.85 * glass}) 70%)`
              : `linear-gradient(150deg, rgba(255,255,255,${0.16 * glass}) 0%, rgba(255,255,255,${0.03 * glass}) 70%)`,
            border: `1.5px solid ${isBlue ? `rgba(120,185,255,${0.9 * glass})` : `rgba(245,247,250,${0.42 * glass})`}`,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, borderRadius: radius, background: C.white, opacity: 1 - glass }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon i={i} o={prog(t, c.split[1] - 0.1, c.split[1] + 0.35) * 0.85} />
        </div>
      </div>
    );
  });

  const lineLen = 840;
  return (
    <div style={{ position: 'absolute', inset: 0, perspective: 1700, perspectiveOrigin: `${PX}px ${PY}px` }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transformOrigin: `${PX}px ${PY}px`,
          transform: `scale(${scale}) rotateX(${rx}deg) rotateY(${ry}deg)`,
        }}
      >
        {/* Respuesta */}
        <div
          style={{
            position: 'absolute',
            left: PX - BOX_W / 2,
            top: 1098,
            width: BOX_W,
            height: 186,
            borderRadius: 36,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
            border: '1.5px solid rgba(245,247,250,0.10)',
            boxSizing: 'border-box',
            opacity: ans * (1 - ansC),
            transformOrigin: `${BOX_W / 2}px 0px`,
            transform: `translateY(${lerp(18, 0, ans) + lerp(0, -150, ansC)}px) scaleY(${lerp(1, 0.25, ansC)})`,
          }}
        >
          {bars.map((bw, k) => {
            const g = prog(t, c.answer[0] + 0.12 + k * 0.12, c.answer[0] + 0.62 + k * 0.12, E.out);
            return (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  left: 58,
                  top: 44 + k * 38,
                  width: bw * g,
                  height: 14,
                  borderRadius: 7,
                  background: k === 0 ? 'rgba(245,247,250,0.42)' : 'rgba(245,247,250,0.26)',
                }}
              />
            );
          })}
        </div>

        {/* Caja de conversación → objeto sólido (escena 01) */}
        {!showModules && (
          <div
            style={{
              position: 'absolute',
              left: PX - boxW / 2,
              top: PY - boxH / 2,
              width: boxW,
              height: boxH,
              transformStyle: 'preserve-3d',
            }}
          >
            {Array.from({ length: DEPTH }, (_, k) => (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: boxH / 2,
                  transform: `translateZ(${-(k + 1) * STEP * solid}px)`,
                  background: `rgba(${lerp(200, 120, k / DEPTH)},${lerp(206, 128, k / DEPTH)},${lerp(216, 140, k / DEPTH)},${solid})`,
                }}
              />
            ))}
            <svg width={boxW} height={boxH} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
              <rect x={0} y={0} width={boxW} height={boxH} rx={boxH / 2} fill={`rgba(255,255,255,${0.035 * box})`} />
              {[1, 0].map((sweep) => {
                const r = boxH / 2 - 1;
                const cx = boxW / 2;
                const xr = sweep ? boxW - 1 - r : 1 + r;
                return (
                  <path
                    key={sweep}
                    d={`M${cx} 1 H${xr} A${r} ${r} 0 0 ${sweep} ${xr} ${boxH - 1} H${cx}`}
                    fill="none"
                    stroke={`rgba(245,247,250,${0.55 * (1 - solid)})`}
                    strokeWidth={2}
                    pathLength={1}
                    strokeDasharray={`${box} 2`}
                  />
                );
              })}
            </svg>
            <div style={{ position: 'absolute', inset: 0, borderRadius: boxH / 2, background: C.white, opacity: solid }} />
          </div>
        )}
        {charEls}
        {/* Cursor */}
        <div
          style={{
            position: 'absolute',
            left: cursorX - 2,
            top: PY - 27,
            width: 4,
            height: 54,
            borderRadius: 2,
            background: C.white,
            opacity: cursorO,
            boxShadow: '0 0 18px rgba(245,247,250,0.35)',
          }}
        />

        {/* Línea luminosa (escena 02) — a media profundidad del canto */}
        {showModules && (
          <svg
            width={1080}
            height={1920}
            style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translateZ(${-STEP * DEPTH * 0.5 * (1 - flat)}px)`, opacity: t < T.s3 + 0.55 ? 1 : 0 }}
          >
            <line x1={120} y1={lineY} x2={120 + lineLen * line} y2={lineY} stroke={C.light} strokeWidth={14} strokeOpacity={0.14} strokeLinecap="round" />
            <line x1={120} y1={lineY} x2={120 + lineLen * line} y2={lineY} stroke={C.light} strokeWidth={3} strokeLinecap="round" />
            {[0, 1, 2, 3].map((i) => {
              const x = PX + (i - 1.5) * 178;
              const lit = clamp((120 + lineLen * line - x) / 40);
              return <circle key={i} cx={x} cy={lineY} r={lerp(0, 7, lit) * (1 - prog(t, T.s3 + 0.45, T.s3 + 0.7))} fill={C.white} opacity={lit} />;
            })}
          </svg>
        )}
        {showModules && modules}
      </div>
    </div>
  );
};
