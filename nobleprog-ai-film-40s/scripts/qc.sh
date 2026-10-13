#!/usr/bin/env bash
# Control de calidad técnico del MP4 exportado (resultados observables, no supuestos).
# Uso: bash scripts/qc.sh deliverables/VIDEO_....mp4 [dir_fotogramas]
set -euo pipefail
cd "$(dirname "$0")/.."
F=${1:?ruta al mp4}
FR=${2:-build/qc_frames}
mkdir -p "$FR"

echo "== ffprobe =="
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=index,codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames,sample_rate,channels,bit_rate,color_space,display_aspect_ratio -of default=nw=1 "$F"

echo "== fotogramas negros (pic_th=0.98, ≥0.05 s) =="
ffmpeg -nostats -i "$F" -vf "blackdetect=d=0.05:pic_th=0.98:pix_th=0.06" -an -f null - 2>&1 | grep -E "black_start" || echo "ninguno"

echo "== fotogramas congelados (≥1,0 s) =="
ffmpeg -nostats -i "$F" -vf "freezedetect=n=0.0008:d=1.0" -an -f null - 2>&1 | grep -E "freeze_(start|duration|end)" || echo "ninguno"

echo "== loudness (EBU R128) =="
ffmpeg -nostats -i "$F" -vn -af ebur128=peak=true -f null - 2>&1 | grep -A30 "Summary" | grep -E "I:|LRA:|Peak:"

echo "== silencios de audio ≥ 0,8 s (-55 dB) =="
ffmpeg -nostats -i "$F" -vn -af silencedetect=n=-55dB:d=0.8 -f null - 2>&1 | grep -E "silence_(start|end)" || echo "ninguno"

echo "== fotogramas de inspección =="
for s in 0 4 8 13 18 24 30 35 39; do
  ffmpeg -y -loglevel error -ss "$s" -i "$F" -frames:v 1 "$FR/qc_$(printf %02d "$s")s.png"
  echo "$FR/qc_$(printf %02d "$s")s.png"
done
