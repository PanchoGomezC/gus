import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, CX, CY } from '../theme';
import { lerp, prog, E, rand } from '../lib/anim';
import type { TL } from '../timeline';

/**
 * Espacio negro profundo con luz de estudio:
 * - gradiente central muy sutil
 * - halo azul cuya intensidad sigue la narrativa
 * - luz ascendente (escena 07) y haz diagonal (escena 08)
 * - viñeta y grano fílmico deterministas
 */
export const Background: React.FC<{ t: number; T: TL; frame: number }> = ({ t, T, frame }) => {
  const c = T.cues;
  // Intensidad del halo azul a lo largo del film (0..1)
  const halo =
    0.15 +
    0.35 * prog(t, T.s2, T.s2 + 1.2) +
    0.2 * prog(t, T.s5, T.s5 + 1.0) -
    0.25 * prog(t, T.s6, T.s6 + 1.5) +
    0.15 * prog(t, T.s7, T.s7 + 1.5) -
    0.2 * prog(t, T.s8, T.s8 + 1.5);

  const rise = prog(t, c.converge[0] - 0.6, c.converge[1] + 0.4, E.smooth) * (1 - 0.55 * prog(t, T.s8 + 0.4, T.s8 + 2.0));
  const diag = prog(t, T.s8 + 0.1, T.s8 + 1.9, E.out);

  const gx = Math.floor(rand(frame) * 512);
  const gy = Math.floor(rand(frame + 999) * 512);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 900px 1250px at ${CX}px ${CY - 80}px, rgba(24,32,52,0.85) 0%, rgba(14,19,31,0.4) 45%, rgba(10,13,20,0) 75%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: Math.max(0, halo),
          background: `radial-gradient(circle 620px at ${CX}px ${CY}px, rgba(13,71,161,0.32) 0%, rgba(13,71,161,0.10) 45%, rgba(13,71,161,0) 72%)`,
        }}
      />
      {/* Luz ascendente */}
      <AbsoluteFill
        style={{
          opacity: rise,
          background: `radial-gradient(ellipse 820px 760px at ${CX}px 1980px, rgba(77,163,255,0.30) 0%, rgba(13,71,161,0.14) 40%, rgba(10,13,20,0) 72%)`,
        }}
      />
      {/* Haz diagonal de cierre */}
      <div
        style={{
          position: 'absolute',
          left: -700,
          top: lerp(-450, 560, diag),
          width: 2500,
          height: 980,
          transform: 'rotate(-32deg)',
          transformOrigin: 'center',
          opacity: diag * 0.9,
          background:
            'linear-gradient(180deg, rgba(77,163,255,0) 0%, rgba(77,163,255,0.035) 30%, rgba(160,200,255,0.075) 50%, rgba(77,163,255,0.035) 70%, rgba(77,163,255,0) 100%)',
        }}
      />
      {/* Viñeta */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 760px 1180px at 540px 980px, rgba(0,0,0,0) 55%, rgba(3,4,8,0.55) 100%)',
        }}
      />
      {/* Grano */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('assets/grain.png')})`,
          backgroundPosition: `${gx}px ${gy}px`,
          opacity: 0.045,
          mixBlendMode: 'overlay',
        }}
      />
      {/* precarga silenciosa del grano para el renderizador */}
      <Img src={staticFile('assets/grain.png')} style={{ display: 'none' }} />
    </AbsoluteFill>
  );
};
