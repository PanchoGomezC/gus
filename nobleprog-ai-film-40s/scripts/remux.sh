#!/usr/bin/env bash
# Rehace audio (diseño + máster) y lo mezcla con la imagen ya renderizada (build/video_noaudio.mp4).
# Uso: bash scripts/remux.sh [salida.mp4]    (VO=... para otra locución)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-deliverables/VIDEO_FINAL_9x16_40s.mp4}
PY=${PYTHON:-python3}
VO=${VO:-public/assets/audio/vo_guide.wav}
node --experimental-strip-types --no-warnings scripts/export-cues.ts
$PY scripts/audio_design.py --vo "$VO"
bash scripts/master_audio.sh
ffmpeg -y -loglevel error -i build/video_noaudio.mp4 -i public/assets/audio/mix_master.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -ac 2 \
  -t 39.6 -movflags +faststart "$OUT"
echo "→ $OUT"
