#!/usr/bin/env bash
# Перекодовує справжні кліпи з media/source/ у public/clips/<lessonId>/ (див. encode-clip.sh).
# --cut прибирає очікування з оригіналів: відлік 3-2-1, смужку таймера, заклики підписатися.
# Замість них урок ставить паузу (gaps у src/mocks/lessons/<lessonId>.json). Часи пауз і субтитрів
# у JSON уже з урахуванням вирізаного. Якщо міняєш --cut, перерахуй їх.
set -euo pipefail
cd "$(dirname "$0")/.."

scripts/encode-clip.sh --cover-at 1.0 media/source/lesson1.mp4 breaking-bad
scripts/encode-clip.sh --cover-at 1.0 --cut 1.55-5.95 --cut 10.05-13.45 --cut 17.75-21.15 --cut 25.5-28.8 --cut 33.25-36.65 --cut 41.0-44.35 --cut 48.7-52.05 --cut 56.45-58.6 media/source/lesson2.mp4 picture-words
scripts/encode-clip.sh --cover-at 0.5 --cut 2.05-3.9 --cut 6.15-7.95 --cut 10.35-12.15 --cut 16.95-18.65 --cut 21.25-23.0 --cut 25.65-27.6 --cut 30.0-31.85 --cut 34.05-35.9 --cut 37.05-40.05 --cut 41.35-43.15 --cut 45.7-47.6 --cut 50.0-51.75 --cut 56.1-58.05 media/source/lesson3.mp4 words-quiz
scripts/encode-clip.sh --cover-at 1.5 --cut 5.4-6.55 --cut 15.8-17.05 --cut 26.1-27.45 --cut 36.1-37.45 --cut 46.1-47.45 --cut 56.0-57.45 --cut 65.9-67.25 --cut 75.9-77.45 --cut 86.1-91.35 media/source/lesson4.mp4 food-quiz
scripts/encode-clip.sh --cover-at 3.0 media/source/lesson5.mp4 haz-tu-tarea
scripts/encode-clip.sh --cover-at 1.0 media/source/lesson6.mp4 office-espanol
scripts/encode-clip.sh --cover-at 2.2 media/source/lesson7.mp4 el-cliente
scripts/encode-clip.sh --cover-at 0.5 media/source/lesson8.mp4 trabalenguas
scripts/encode-clip.sh --cover-at 4.5 media/source/lesson9.mp4 shrek-burro
