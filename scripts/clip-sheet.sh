#!/usr/bin/env bash
# Аркуш кадрів з часом на кожному: щоб знайти, коли на екрані з'являється відповідь.
#
# Використання: scripts/clip-sheet.sh <відео> [від_сек] [тривалість_сек] [кадрів_за_сек] [вихідний.png]
#   scripts/clip-sheet.sh media/source/lesson7.mp4                 # усе відео, кадр кожні 2 с
#   scripts/clip-sheet.sh media/source/lesson7.mp4 12 3 5          # 12–15 с, 5 кадрів за секунду
# За замовчуванням пише clip-sheet.png у поточну теку. Час у кадрі — секунди від початку файлу.
set -euo pipefail
(( $# >= 1 )) || { sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 1; }
input="$1"; from="${2:-0}"; len="${3:-}"; fps="${4:-0.5}"; out="${5:-clip-sheet.png}"
[[ -f "$input" ]] || { echo "Файл не знайдено: $input" >&2; exit 1; }

total="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$input")"
len="${len:-$(awk -v t="$total" -v f="$from" 'BEGIN { print t - f }')}"
n="$(awk -v l="$len" -v f="$fps" 'BEGIN { n = int(l * f + 0.999); print (n < 1 ? 1 : n) }')"
cols=$(( n < 10 ? n : 10 )); rows=$(( (n + cols - 1) / cols ))

ffmpeg -hide_banner -loglevel error -y -ss "$from" -t "$len" -i "$input" \
  -vf "fps=$fps,scale=180:-2,drawtext=text='%{eif\:t+$from\:d}.%{eif\:mod((t+$from)*10\,10)\:d}':x=4:y=4:fontsize=20:fontcolor=yellow:box=1:boxcolor=black,tile=${cols}x${rows}" \
  -frames:v 1 "$out"
echo "Готово: $out ($n кадрів, ${cols}×${rows})"
