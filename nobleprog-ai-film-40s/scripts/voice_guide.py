"""
GUÍA DE LOCUCIÓN TEMPORAL (NO es la voz final de ElevenLabs).

Genera una locución guía con Kokoro TTS (modelo abierto, Apache-2.0) frase por
frase, inserta pausas controladas y exporta:
  - public/assets/audio/vo_guide.wav       (48 kHz, mono)
  - src/timing.json                          (mapa de tiempos por frase)

Uso:
  python scripts/voice_guide.py --models <dir con kokoro-v1.0.onnx y voices-v1.0.bin>

Las grafías fonéticas (p. ej. "Clod") solo existen para que el sintetizador
pronuncie correctamente las marcas; el texto oficial está en
deliverables/VOICEOVER_ELEVENLABS.txt.
"""
import argparse
import json
import os

import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from scipy.signal import resample_poly

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

from phrases import PHRASES  # noqa: E402

SR_OUT = 48000


def trim(x, thr=0.008):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - 240)
    b = min(len(x), idx[-1] + 600)
    return x[a:b]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", required=True)
    ap.add_argument("--voice", default="em_alex")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--lead", type=float, default=0.55, help="silencio inicial (s)")
    args = ap.parse_args()

    kokoro = Kokoro(os.path.join(args.models, "kokoro-v1.0.onnx"),
                    os.path.join(args.models, "voices-v1.0.bin"))

    out = [np.zeros(int(args.lead * SR_OUT), dtype=np.float32)]
    t = args.lead
    timing = []
    for i, (official, spoken, pause) in enumerate(PHRASES):
        samples, sr = kokoro.create(spoken, voice=args.voice, speed=args.speed, lang="es")
        samples = trim(np.asarray(samples, dtype=np.float32))
        samples = resample_poly(samples, SR_OUT, sr).astype(np.float32)
        dur = len(samples) / SR_OUT
        timing.append({"id": i + 1, "text": official, "start": round(t, 3), "end": round(t + dur, 3)})
        out.append(samples)
        t += dur
        if pause > 0:
            out.append(np.zeros(int(pause * SR_OUT), dtype=np.float32))
            t += pause

    audio = np.concatenate(out)
    peak = np.max(np.abs(audio))
    audio = audio / peak * 0.89  # ~ -1 dBFS pico; la mezcla final normaliza loudness
    dst = os.path.join(ROOT, "public", "assets", "audio", "vo_guide.wav")
    sf.write(dst, audio, SR_OUT, subtype="PCM_24")
    meta = {
        "source": "GUIDE (Kokoro TTS, voice %s) — reemplazar por ElevenLabs" % args.voice,
        "file": "assets/audio/vo_guide.wav",
        "duration": round(len(audio) / SR_OUT, 3),
        "phrases": timing,
    }
    with open(os.path.join(ROOT, "src", "timing.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
