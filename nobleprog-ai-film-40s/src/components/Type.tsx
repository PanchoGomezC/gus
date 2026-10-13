import React from 'react';
import { C, FONT, fitSize, textWidth } from '../theme';
import { E, clamp, lerp, prog } from '../lib/anim';
import type { TL } from '../timeline';

/** Flecha vectorial (Montserrat no incluye «→»). */
export const Arrow: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size * 1.1} height={size * 0.7} viewBox="0 0 22 14" style={{ display: 'inline-block', margin: `0 ${size * 0.25}px`, transform: `translateY(${size * 0.02}px)` }}>
    <path d="M1 7 H19 M13.5 1.5 L19.5 7 L13.5 12.5" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Entry = { at: number; label: string | null; word: string | null };

const LABEL_SIZE = 30;
const LABEL_TRACK = 0.32;
const WORD_MAX = 124;
const WORD_W = 920;
const LABEL_TOP = 312;
const WORD_TOP = 360;

const renderLabel = (s: string) => {
  const parts = s.split('→');
  return parts.map((p, i) => (
    <React.Fragment key={i}>
      {p.trim()}
      {i < parts.length - 1 ? <Arrow size={LABEL_SIZE} color={C.light} /> : null}
    </React.Fragment>
  ));
};

/**
 * Sistema tipográfico superior: etiqueta de capítulo + palabra monumental.
 * Cada cambio usa máscaras: la palabra saliente sube y desaparece,
 * la entrante emerge desde abajo con tracking que se asienta.
 */
export const TitleSystem: React.FC<{ t: number; T: TL }> = ({ t, T }) => {
  const c = T.cues;
  const p1 = T.phrases[0];
  const entries: Entry[] = [
    { at: p1.start + (p1.end - p1.start) * 0.55, label: 'ANTES', word: null },
    { at: p1.start + (p1.end - p1.start) * 0.74, label: 'ANTES', word: 'RESPUESTAS' },
    { at: T.s2 + 0.05, label: 'AHORA', word: 'SISTEMAS' },
    { at: T.s3 + 0.15, label: 'DATOS → DECISIONES', word: 'CLAUDE' },
    { at: T.s4 + 0.15, label: 'MÉTODO', word: 'CONTEXTO' },
    { at: c.verifWord, label: 'MÉTODO', word: 'VERIFICACIÓN' },
    { at: T.s5 + 0.15, label: 'DEL OBJETIVO A LA ACCIÓN', word: 'AGENTES' },
    { at: T.s6 + 0.15, label: 'CRITERIO HUMANO', word: 'CHATGPT' },
    { at: T.s7 + 0.1, label: 'TRES EXPERIENCIAS', word: null },
    { at: c.evolutionWord, label: 'TRES EXPERIENCIAS', word: 'UNA EVOLUCIÓN' },
    { at: c.converge[0] + 0.1, label: null, word: null },
  ];

  const layers: React.ReactNode[] = [];
  const DUR = 0.6;

  // Palabras: cada entrada vive desde su "at" hasta el "at" de la siguiente entrada con palabra distinta
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.word) continue;
    if (i > 0 && entries[i - 1].word === e.word) continue;
    let endAt = Infinity;
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[j].word !== e.word) {
        endAt = entries[j].at;
        break;
      }
    }
    if (t < e.at - 0.01 || t > endAt + DUR) continue;
    const pin = prog(t, e.at, e.at + DUR, E.inOut);
    const pout = prog(t, endAt, endAt + DUR, E.inOut);
    const size = fitSize(e.word, 800, WORD_W, WORD_MAX, -0.01);
    const track = lerp(0.06, -0.01, prog(t, e.at, e.at + 1.1, E.out));
    const y = lerp(100, 0, pin) + lerp(0, -100, pout);
    const sheen = clamp((t - e.at - 0.35) / 1.1);
    layers.push(
      <div
        key={`w${i}`}
        style={{
          position: 'absolute',
          left: 0,
          width: 1080,
          top: WORD_TOP,
          height: size * 1.25,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: size,
            lineHeight: `${size * 1.25}px`,
            letterSpacing: `${track}em`,
            transform: `translateY(${y}%) translateX(${(track * size) / 2}px)`,
            whiteSpace: 'nowrap',
            backgroundImage: `linear-gradient(100deg, ${C.white} ${lerp(-30, 110, sheen) - 18}%, #ffffff ${lerp(-30, 110, sheen)}%, ${C.white} ${lerp(-30, 110, sheen) + 18}%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            opacity: (0.35 + 0.65 * pin) * (1 - pout * 0.6),
          }}
        >
          {e.word}
        </div>
      </div>,
    );
  }

  // Etiquetas
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.label) continue;
    if (i > 0 && entries[i - 1].label === e.label) continue;
    let endAt = Infinity;
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[j].label !== e.label) {
        endAt = entries[j].at;
        break;
      }
    }
    const follows = i > 0 && entries[i - 1].label !== null;
    const a0 = e.at + (follows ? 0.24 : 0);
    if (t < a0 - 0.01 || t > endAt + 0.24) continue;
    const pin = prog(t, a0, a0 + 0.55, E.out);
    const pout = prog(t, endAt, endAt + 0.24, E.in);
    const w = textWidth(e.label.replace('→', ''), 600, LABEL_SIZE, LABEL_TRACK);
    const reveal = lerp(0, 100, prog(t, a0, a0 + 0.7, E.out));
    layers.push(
      <div
        key={`l${i}`}
        style={{
          position: 'absolute',
          left: 0,
          width: 1080,
          top: LABEL_TOP + lerp(10, 0, pin) + lerp(0, -10, pout),
          display: 'flex',
          justifyContent: 'center',
          opacity: pin * (1 - pout),
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: LABEL_SIZE,
            letterSpacing: `${LABEL_TRACK}em`,
            color: C.light,
            whiteSpace: 'nowrap',
            transform: `translateX(${(LABEL_TRACK * LABEL_SIZE) / 2}px)`,
            WebkitMaskImage: `linear-gradient(90deg, #000 ${reveal}%, transparent ${reveal + 12}%)`,
            maskImage: `linear-gradient(90deg, #000 ${reveal}%, transparent ${reveal + 12}%)`,
            minWidth: w * 0.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {renderLabel(e.label)}
        </div>
      </div>,
    );
  }

  return <>{layers}</>;
};
