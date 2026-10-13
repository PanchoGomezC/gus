// Renderiza fotogramas de control en segundos concretos (bundle único).
// Uso: node scripts/stills.mjs <outDir> <comp> <t1> <t2> ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition, openBrowser } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outDir, compId = 'Film30', ...times] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const browserExecutable =
  process.env.REMOTION_BROWSER ??
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts') });
const browser = await openBrowser('chrome', { browserExecutable, chromiumOptions: { gl: 'angle' } });
const composition = await selectComposition({ serveUrl, id: compId, puppeteerInstance: browser, inputProps: { withAudio: false } });
for (const ts of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(parseFloat(ts) * composition.fps));
  const output = path.join(outDir, `t_${parseFloat(ts).toFixed(2)}.png`);
  const t0 = Date.now();
  await renderStill({ serveUrl, composition, frame, output, puppeteerInstance: browser, inputProps: { withAudio: false } });
  console.log(`${output}  (${Date.now() - t0} ms)`);
}
await browser.close({ silent: true });
