#!/usr/bin/env bash
# Генерує плейсхолдер-відео для уроку: public/clips/<lessonId>/video.mp4 і cover.jpg.
# 720x1280, тривалість = durationSec. На кадрі рядки cues у свій час (як вшиті субтитри в TikTok).
# Звук: тиха фонова музика з media/music/ (див. CREDITS.md там), без неї тиша. Ніякого тону: він ріже вухо.
#
# Використання: scripts/make-placeholder-clips.sh [--debug] [lessonId ...]   (без id: усі уроки з type=file)
#   --debug  вшити в кадр id уроку й таймер, щоб звіряти, на якій секунді спрацьовує пауза.
# Потрібні: ffmpeg (з libx264, aac, drawtext), jq, шрифт DejaVuSans.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LESSONS_DIR="$ROOT/src/mocks/lessons"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MUSIC="$ROOT/media/music/and-so-it-begins.m4a"

missing=0
command -v ffmpeg >/dev/null || { echo "ffmpeg не знайдено. Встанови: sudo apt install ffmpeg" >&2; missing=1; }
command -v jq >/dev/null || { echo "jq не знайдено. Встанови: sudo apt install jq" >&2; missing=1; }
[[ -f "$FONT" && -f "$FONT_BOLD" ]] || { echo "Шрифт DejaVu не знайдено. Встанови: sudo apt install fonts-dejavu-core" >&2; missing=1; }
(( missing == 0 )) || exit 1

debug=0
if [[ "${1:-}" == --debug ]]; then
  debug=1
  shift
fi

if (( $# > 0 )); then
  ids=("$@")
else
  mapfile -t ids < <(for f in "$LESSONS_DIR"/*.json; do
    [[ "$(basename "$f")" == index.json ]] && continue
    jq -r 'select(.video.type == "file") | .id' "$f"
  done)
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

palette=(0x1f2937 0x1e3a8a 0x4c1d95 0x7c2d12 0x14532d)

for i in "${!ids[@]}"; do
  id="${ids[$i]}"
  json="$LESSONS_DIR/$id.json"
  [[ -f "$json" ]] || { echo "Урок не знайдено: $json" >&2; exit 1; }
  out="$ROOT/public/clips/$id"
  mkdir -p "$out"
  dur="$(jq -r '.durationSec' "$json")"
  color="${palette[$((i % ${#palette[@]}))]}"

  # Текст кожного рядка в окремому файлі: так drawtext не потребує екранування.
  vf="null"
  if (( debug )); then
    vf+=",drawtext=fontfile=$FONT:text='$id':fontcolor=white@0.6:fontsize=36:x=(w-text_w)/2:y=120"
    vf+=",drawtext=fontfile=$FONT:text='%{pts\\:hms}':fontcolor=white@0.6:fontsize=32:x=(w-text_w)/2:y=180"
  fi
  n=0
  while IFS=$'\t' read -r start end text; do
    # Перенос по ~20 символів: на вузькому екрані (9:20) кадр обрізається з боків.
    # Кожен рядок окремим drawtext: новий ffmpeg малює \n у textfile як квадратик.
    k=0
    while IFS= read -r line || [[ -n "$line" ]]; do
      printf '%s' "$line" > "$TMP/$id-$n-$k.txt"
      vf+=",drawtext=fontfile=$FONT_BOLD:textfile=$TMP/$id-$n-$k.txt:fontcolor=white:fontsize=40"
      vf+=":box=1:boxcolor=black@0.5:boxborderw=12:x=(w-text_w)/2:y=h*0.62+$k*64:enable='between(t,$start,$end)'"
      k=$((k + 1))
    done < <(printf '%s' "$text" | fold -s -w 20 | sed 's/ *$//')
    n=$((n + 1))
  done < <(jq -r '.cues[] | [.start, .end, .es] | @tsv' "$json")

  echo "→ $id ($dur с, $n рядків)"
  if [[ -f "$MUSIC" ]]; then
    fade_out="$(awk -v d="$dur" 'BEGIN { print (d > 2 ? d - 1.5 : 0) }')"
    audio=(-i "$MUSIC")
    af=(-af "volume=0.35,afade=t=in:d=1,afade=t=out:st=$fade_out:d=1.5")
  else
    audio=(-f lavfi -i "anullsrc=r=44100:cl=stereo")
    af=()
  fi
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "color=c=$color:s=720x1280:d=$dur:r=30" \
    "${audio[@]}" -t "$dur" \
    -vf "$vf" "${af[@]}" \
    -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 28 -c:a aac -b:a 64k -shortest -movflags +faststart \
    "$out/video.mp4"
  ffmpeg -hide_banner -loglevel error -y -ss 1 -i "$out/video.mp4" -frames:v 1 -q:v 3 "$out/cover.jpg"
done

echo "Готово: ${ids[*]}"
