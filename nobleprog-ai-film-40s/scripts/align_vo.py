"""
Alinea una locución nueva (p. ej. la toma final de ElevenLabs) con el montaje.

1. Recorta el silencio inicial y coloca la primera frase en --lead segundos.
2. Detecta las 9 frases por silencios (fusiona pausas internas o divide
   proporcionalmente si la voz no hace pausa entre frases).
3. Escribe public/assets/audio/vo_final.wav y src/timing.json.
Después: VO=public/assets/audio/vo_final.wav bash scripts/render.sh

Uso: python scripts/align_vo.py ruta/a/locucion.(mp3|wav) [--lead 0.55]
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from phrases import PHRASES  # noqa: E402  (texto oficial por frase)

SR = 48000
MAX_END = 37.6  # la última frase debe terminar antes para dejar leer "TÚ DECIDES."


def load(path):
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'in.wav')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), wav], check=True)
        x, _ = sf.read(wav)
    return x.astype(np.float32)


def speech_segments(x, min_sil=0.22, thr_db=-38):
    hop = int(0.01 * SR)
    frames = len(x) // hop
    rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(frames)])
    db = 20 * np.log10(rms / rms.max())
    voiced = db > thr_db
    segs, start, sil = [], None, 0
    for i, v in enumerate(voiced):
        if v:
            if start is None:
                start = i
            sil = 0
        elif start is not None:
            sil += 1
            if sil * 0.01 >= min_sil:
                segs.append([start * 0.01, (i - sil + 1) * 0.01])
                start, sil = None, 0
    if start is not None:
        segs.append([start * 0.01, frames * 0.01])
    return [s for s in segs if s[1] - s[0] > 0.12]


def fit_to(segs, n, texts):
    segs = [list(s) for s in segs]
    while len(segs) > n:  # fusionar la pausa más corta
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        k = int(np.argmin(gaps))
        segs[k] = [segs[k][0], segs[k + 1][1]]
        del segs[k + 1]
    while len(segs) < n:  # dividir el segmento con más texto pendiente, en proporción
        k = int(np.argmax([s[1] - s[0] for s in segs]))
        a, b = segs[k]
        mid = a + (b - a) * 0.5
        segs[k] = [a, mid]
        segs.insert(k + 1, [mid, b])
    return segs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('vo')
    ap.add_argument('--lead', type=float, default=0.55)
    ap.add_argument('--dry-run', action='store_true', help='solo muestra la detección, no escribe archivos')
    args = ap.parse_args()

    x = load(args.vo)
    segs = speech_segments(x)
    if not segs:
        sys.exit('No se detectó voz.')
    shift = args.lead - segs[0][0]
    if shift > 0:
        x = np.concatenate([np.zeros(int(shift * SR), np.float32), x])
    else:
        x = x[int(-shift * SR):]
    segs = [[a + shift, b + shift] for a, b in segs]
    texts = [p[0] for p in PHRASES]
    segs = fit_to(segs, len(texts), texts)

    phrases = [{'id': i + 1, 'text': texts[i], 'start': round(a, 3), 'end': round(b, 3)} for i, (a, b) in enumerate(segs)]
    if phrases[-1]['end'] > MAX_END:
        print(f'⚠ La locución termina en {phrases[-1]["end"]:.2f}s (> {MAX_END}s). '
              'Pide una toma algo más rápida o reduce pausas para no superar 40 s.')

    if args.dry_run:
        for p in phrases:
            print(f"{p['id']}  {p['start']:6.2f} → {p['end']:6.2f}  {p['text']}")
        return
    dst = os.path.join(ROOT, 'public/assets/audio/vo_final.wav')
    sf.write(dst, x, SR, subtype='PCM_24')
    meta = {'source': f'FINAL — {os.path.basename(args.vo)}', 'file': 'assets/audio/vo_final.wav', 'duration': round(len(x) / SR, 3), 'phrases': phrases}
    with open(os.path.join(ROOT, 'src/timing.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    for p in phrases:
        print(f"{p['id']}  {p['start']:6.2f} → {p['end']:6.2f}  {p['text']}")
    print(f'→ {dst}\n→ src/timing.json\nSiguiente: VO={dst} bash scripts/render.sh')


if __name__ == '__main__':
    main()
