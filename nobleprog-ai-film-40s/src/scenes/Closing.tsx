import React from 'react';
import { C, FONT, fitSize } from '../theme';
import { E, lerp, prog } from '../lib/anim';
import type { TL } from '../timeline';

/**
 * ESCENA 08 — tipografía de cierre.
 * LA IA PROPONE. → TÚ DECIDES. → firma discreta.
 */
const L1 = 'LA IA PROPONE.';
const L2 = 'TÚ DECIDES.';
const S1 = fitSize(L1, 700, 860, 96, 0.01);
const S2 = fitSize(L2, 800, 900, 150, -0.01);
const Y1 = 1000;
const Y2 = Y1 + S1 * 1.25 + 6;

export const Closing: React.FC<{ t: number; T: TL }> = ({ t, T }) => {
  const c = T.cues;
  if (t < c.line1 - 0.05) return null;

  const a1 = prog(t, c.line1, c.line1 + 0.75, E.out);
  const a2 = prog(t, c.line2, c.line2 + 0.85, E.out);
  const track2 = lerp(0.07, -0.01, prog(t, c.line2, c.line2 + 1.6, E.out));
  const dim1 = lerp(1, 0.5, prog(t, c.line2, c.line2 + 0.8, E.smooth));
  const sig = prog(t, c.signature, c.signature + 0.8, E.out);
  const rule = prog(t, c.signature + 0.15, c.signature + 0.9, E.inOut);
  const drift = lerp(1, 1.015, prog(t, T.s8, T.END, E.linear));

  return (
    <div style={{ position: 'absolute', inset: 0, transform: `scale(${drift})`, transformOrigin: '540px 1150px' }}>
      <div style={{ position: 'absolute', left: 0, width: 1080, top: Y1, height: S1 * 1.25, overflow: 'hidden', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: S1,
            lineHeight: `${S1 * 1.25}px`,
            letterSpacing: '0.01em',
            color: C.white,
            opacity: dim1,
            transform: `translateY(${lerp(100, 0, a1)}%)`,
            whiteSpace: 'nowrap',
          }}
        >
          {L1}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, width: 1080, top: Y2, height: S2 * 1.25, overflow: 'hidden', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: S2,
            lineHeight: `${S2 * 1.25}px`,
            letterSpacing: `${track2}em`,
            color: '#ffffff',
            transform: `translateY(${lerp(100, 0, a2)}%) translateX(${(track2 * S2) / 2}px)`,
            whiteSpace: 'nowrap',
            textShadow: `0 0 ${60 * a2}px rgba(77,163,255,0.25)`,
          }}
        >
          TÚ DECIDES<span style={{ color: C.gold }}>.</span>
        </div>
      </div>

      {/* Firma */}
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 1420, textAlign: 'center', opacity: sig, transform: `translateY(${lerp(14, 0, sig)}px)` }}>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 33, letterSpacing: '0.28em', color: 'rgba(245,247,250,0.92)', transform: 'translateX(4.6px)' }}>
          FRANCISCO GÓMEZ
        </div>
      </div>
      <div style={{ position: 'absolute', left: 540 - 40 * rule, width: 80 * rule, top: 1478, height: 2, background: C.light, opacity: 0.8 }} />
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 1502, textAlign: 'center', opacity: prog(t, c.signature + 0.3, c.signature + 1.0, E.out) }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 27, letterSpacing: '0.46em', color: C.light, transform: 'translateX(6.2px)' }}>NOBLEPROG</div>
      </div>
    </div>
  );
};
