#!/usr/bin/env bash
# Генерує плейсхолдер-кліпи для уроку: public/clips/<lessonId>/<clipId>.mp4
# 720x1280, 6 с, колір фону залежить від kind сцени, у центрі id кліпу, тихий тон.
# Плюс cover.jpg з першого кадру стартової сцени.
#
# Використання: scripts/make-placeholder-clips.sh [lessonId]   (за замовчуванням shop-spain)
# Потрібні: ffmpeg (з libx264, aac, drawtext), jq, шрифт DejaVuSans.
set -euo pipefail

LESSON_ID="${1:-shop-spain}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LESSON_JSON="$ROOT/src/mocks/lessons/$LESSON_ID.json"
OUT_DIR="$ROOT/public/clips/$LESSON_ID"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

missing=0
command -v ffmpeg >/dev/null || { echo "ffmpeg не знайдено. Встанови: sudo apt install ffmpeg" >&2; missing=1; }
command -v jq >/dev/null || { echo "jq не знайдено. Встанови: sudo apt install jq" >&2; missing=1; }
[[ -f "$FONT" ]] || { echo "Шрифт $FONT не знайдено. Встанови: sudo apt install fonts-dejavu-core" >&2; missing=1; }
[[ -f "$LESSON_JSON" ]] || { echo "Урок не знайдено: $LESSON_JSON" >&2; missing=1; }
(( missing == 0 )) || exit 1

color_for_kind() {
  case "$1" in
    prompt) echo "0x1f2937" ;;   # сірий графіт
    reaction) echo "0x1e3a8a" ;; # синій
    end) echo "0x14532d" ;;      # зелений
    *) echo "0x3f3f46" ;;
  esac
}

mkdir -p "$OUT_DIR"

# Унікальні кліпи: якщо кілька сцен посилаються на один clip, береться kind першої.
jq -r '[.scenes[] | {clip, kind}] | unique_by(.clip) | .[] | "\(.clip) \(.kind)"' "$LESSON_JSON" |
while read -r clip kind; do
  color="$(color_for_kind "$kind")"
  echo "→ $clip ($kind, $color)"
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "color=c=$color:s=720x1280:d=6:r=30" \
    -f lavfi -i "sine=frequency=220:duration=6" \
    -vf "drawtext=fontfile=$FONT:text='$clip':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2" \
    -af "volume=0.05" \
    -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
    "$OUT_DIR/$clip.mp4"
done

start_clip="$(jq -r '.startSceneId as $s | .scenes[] | select(.id == $s) | .clip' "$LESSON_JSON")"
ffmpeg -hide_banner -loglevel error -y -ss 1 -i "$OUT_DIR/$start_clip.mp4" -frames:v 1 -q:v 3 "$OUT_DIR/cover.jpg"

echo "Готово: $(ls "$OUT_DIR" | wc -l) файлів у $OUT_DIR"
