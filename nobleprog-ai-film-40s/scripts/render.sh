#!/usr/bin/env bash
# Pipeline completo: cues → audio → render de imagen → mux → MP4 final.
# Uso: bash scripts/render.sh [Film|Film30] [salida.mp4]
#   VO=ruta/locucion.wav  para usar otra locución (p. ej. la final de ElevenLabs,
#   tras alinear con scripts/align_vo.py)
set -euo pipefail
cd "$(dirname "$0")/.."
COMP=${1:-Film}
OUT=${2:-deliverables/VIDEO_FINAL_9x16_40s.mp4}
PY=${PYTHON:-python3}
VO=${VO:-public/assets/audio/vo_guide.wav}
mkdir -p build deliverables

node --experimental-strip-types --no-warnings scripts/export-cues.ts
$PY scripts/audio_design.py --vo "$VO"
bash scripts/master_audio.sh

npx remotion render src/index.ts "$COMP" build/video_noaudio.mp4 \
  --muted --codec=h264 --crf=16 --x264-preset=slow --pixel-format=yuv420p \
  --color-space=bt709 --props='{"withAudio":false}' --log=error

ffmpeg -y -loglevel error -i build/video_noaudio.mp4 -i public/assets/audio/mix_master.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -ac 2 \
  -t 39.6 -movflags +faststart "$OUT"
echo "→ $OUT"
