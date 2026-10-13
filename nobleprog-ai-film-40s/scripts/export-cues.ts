// Exporta el mapa de cues del montaje para el diseño sonoro.
// Uso: node --experimental-strip-types scripts/export-cues.ts
import fs from 'node:fs';
import path from 'node:path';
import { buildTimeline } from '../src/timeline.ts';

const root = path.resolve(import.meta.dirname, '..');
const timing = JSON.parse(fs.readFileSync(path.join(root, 'src/timing.json'), 'utf8'));
const T = buildTimeline(timing);
const out = path.join(root, 'build/cues.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(T, null, 2));
console.log(`cues → ${out}`);
