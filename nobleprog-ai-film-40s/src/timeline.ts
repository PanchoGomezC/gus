// Fuente única de verdad del montaje. La usan Remotion (animación) y
// scripts/export-cues.ts (diseño sonoro), así imagen y sonido nunca se desfasan.
// Todo el tiempo se expresa en segundos absolutos.

export type Phrase = { id: number; text: string; start: number; end: number };
export type Timing = { source: string; file: string; duration: number; phrases: Phrase[] };

export const END = 39.6;

export function buildTimeline(tm: Timing) {
  const P = (i: number) => tm.phrases[i - 1];
  const d = (i: number) => P(i).end - P(i).start;
  const at = (i: number, f: number) => P(i).start + d(i) * f;

  // Inicio de escena: la imagen anticipa a la voz unas décimas.
  const s1 = 0;
  const s2 = P(2).start - 0.35;
  const s3 = P(3).start - 0.3;
  const s4 = P(4).start - 0.3;
  const s5 = P(5).start - 0.3;
  const s6 = P(6).start - 0.3;
  const s7 = P(7).start - 0.3;
  const s8 = P(9).start - 0.45;

  const prompt = '¿Qué dicen estos datos?';
  const typeStart = 1.35;
  const typeStep = 0.055;

  const cues = {
    // 01 — origen
    boxDraw: [0.65, 1.3] as const,
    typeStart,
    typeStep,
    typeEnd: typeStart + prompt.length * typeStep,
    answer: [2.75, 3.45] as const,
    compact: [s2 - 0.95, s2] as const,
    // 02 — sistemas
    split: [s2, s2 + 0.75] as const,
    lineDraw: [s2 + 0.7, s2 + 1.5] as const,
    // 03 — Claude
    birth: [s3 + 0.25, s3 + 1.0] as const,
    decompose: [s3 + 1.2, s3 + 2.6] as const,
    fuse: [s3 + 2.6, s3 + 3.1] as const,
    panel: [s3 + 2.55, s3 + 3.5] as const,
    // 04 — verificación
    sheets: [s4 + 0.3, s4 + 0.55, s4 + 0.8] as const,
    verifWord: at(4, 0.42),
    scan: [s4 + 1.9, s4 + 3.0] as const,
    correct: [s4 + 3.0, s4 + 3.45] as const,
    check: s4 + 3.6,
    // 05 — agentes
    deploy: [s5 + 0.35, s5 + 1.35] as const,
    signal: s5 + 1.55,
    signalSpoke: 0.35,
    signalLoop: 2.3,
    // instantes en que la señal alcanza cada nodo (0 = objetivo) y fin del ciclo
    signalNodes: [0, 1, 2, 3, 4, 5].map((i) => s5 + 1.55 + 0.35 + (i / 6) * 2.3),
    signalDone: s5 + 1.55 + 0.35 + 2.3 + 0.35,
    // 06 — liderazgo
    cards: [s6, s6 + 1.25] as const,
    highlight: s6 + 1.55,
    focus: [s6 + 2.2, s6 + 3.4] as const,
    risk: at(6, 0.55),
    priority: at(6, 0.78),
    // 07 — evolución
    shapes: [s7, s7 + 1.0] as const,
    connect: [s7 + 1.0, s7 + 1.55] as const,
    evolutionWord: at(7, 0.45),
    converge: [P(8).start - 0.35, P(8).start + 1.15] as const,
    // 08 — cierre
    line1: P(9).start + 0.05,
    line2: at(9, 0.6),
    signature: Math.min(P(9).end + 0.25, END - 1.6),
  };

  return {
    scenes: [s1, s2, s3, s4, s5, s6, s7, s8],
    s1, s2, s3, s4, s5, s6, s7, s8,
    END,
    prompt,
    phrases: tm.phrases,
    cues,
  };
}

export type TL = ReturnType<typeof buildTimeline>;
