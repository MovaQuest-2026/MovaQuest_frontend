#!/usr/bin/env bash
# Готує справжній кліп для уроку: public/clips/<lessonId>/video.mp4 і cover.jpg.
# Кадр 720x1280 (9:16, без смуг: масштаб «cover» і обрізка по центру), до 30 fps,
# H.264 High + AAC, faststart (moov на початку файлу, щоб відео грало й перемотувалось одразу).
#
# Використання: scripts/encode-clip.sh [--cover-at СЕК] [--crf N] <вхідний файл> <lessonId>
#   --cover-at  секунда кадру для обкладинки (за замовчуванням 1)
#   --crf       якість x264: менше = краще й більше (за замовчуванням 23; 20–26 розумно)
# Потрібні: ffmpeg (з libx264 і aac), ffprobe.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAX_MB=8

usage() { sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 1; }

cover_at=1
crf=23
while (( $# > 0 )); do
  case "$1" in
    --cover-at) cover_at="${2:?}"; shift 2 ;;
    --crf) crf="${2:?}"; shift 2 ;;
    -h|--help) usage ;;
    -*) echo "Невідомий параметр: $1" >&2; usage ;;
    *) break ;;
  esac
done
(( $# == 2 )) || usage
input="$1"
id="$2"

command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null \
  || { echo "ffmpeg/ffprobe не знайдено. Встанови: sudo apt install ffmpeg" >&2; exit 1; }
[[ "$id" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "lessonId має бути kebab-case: $id" >&2; exit 1; }
[[ -f "$input" ]] || { echo "Файл не знайдено: $input" >&2; exit 1; }

out="$ROOT/public/clips/$id"
mkdir -p "$out"
tmp="$out/.video.tmp.mp4"
trap 'rm -f "$tmp"' EXIT

echo "→ $id: кодую $input"
# Звук необов'язковий (0:a:0?): кліп без доріжки теж закодується.
ffmpeg -hide_banner -loglevel error -stats -y -i "$input" \
  -map 0:v:0 -map '0:a:0?' -map_metadata -1 \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1" -fpsmax 30 \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf "$crf" -maxrate 2500k -bufsize 5000k \
  -c:a aac -b:a 96k -ac 2 -ar 44100 \
  -movflags +faststart \
  "$tmp"
mv "$tmp" "$out/video.mp4"

ffmpeg -hide_banner -loglevel error -y -ss "$cover_at" -i "$out/video.mp4" -frames:v 1 -q:v 3 "$out/cover.jpg"

dur="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$out/video.mp4")"
bytes="$(stat -c %s "$out/video.mp4")"
mb="$(awk -v b="$bytes" 'BEGIN { printf "%.1f", b / 1048576 }')"

echo "Готово: public/clips/$id/video.mp4 (${mb} МБ), cover.jpg"
echo "Тривалість: $dur с → \"durationSec\": $(awk -v d="$dur" 'BEGIN { printf "%d", d + 0.5 }') у src/mocks/lessons/$id.json і index.json"
echo "У JSON уроку: \"video\": { \"type\": \"file\", \"src\": \"/clips/$id/video.mp4\" }, \"cover\": \"/clips/$id/cover.jpg\""
if awk -v b="$bytes" -v m="$MAX_MB" 'BEGIN { exit !(b > m * 1048576) }'; then
  echo "Увага: файл більший за $MAX_MB МБ. Він назавжди лишиться в історії git; спробуй --crf 26 або коротший кліп." >&2
fi
