#!/usr/bin/env bash
# Masterización: lleva la premezcla a -14 LUFS integrados con true peak ≤ -1,5 dBTP.
# Uso: bash scripts/master_audio.sh
set -euo pipefail
cd "$(dirname "$0")/.."
IN=public/assets/audio/mix_premaster.wav
OUT=public/assets/audio/mix_master.wav
TARGET=-14.0

measure() { ffmpeg -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/I:/{i=$2} /Peak:/{p=$2} END{print i, p}'; }

read -r I _ < <(measure "$IN")
G=$(python3 -c "print(round($TARGET - ($I), 2) + 0.25)")
ffmpeg -y -loglevel error -i "$IN" -af "volume=${G}dB,alimiter=limit=0.8:attack=4:release=60:level=false:asc=1,aresample=48000" -c:a pcm_s24le "$OUT"
read -r I2 P2 < <(measure "$OUT")
echo "premezcla ${I} LUFS → ganancia ${G} dB → master ${I2} LUFS · true peak ${P2} dBTP"
