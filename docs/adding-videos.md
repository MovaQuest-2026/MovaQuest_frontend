# Як додати нове відео в урок

Покроково: від сирого mp4 до уроку зі стрічки з паузами. Так зроблені уроки `breaking-bad`, `picture-words`, `words-quiz`, `food-quiz` і `haz-tu-tarea`. Їхні JSON у `src/mocks/lessons/` можна брати за зразок.

Потрібні `ffmpeg` і `ffprobe` (`sudo apt install ffmpeg`). Розшифровка мовлення (крок 3) необов'язкова.

## 1. Поклади оригінал

```bash
cp ~/Downloads/clip.mp4 media/source/lesson6.mp4
```

Оригінали лежать у `media/source/`, а не в `public/`, тому в білд не потрапляють. Публічні кліпи скрипт кодування кладе сам у `public/clips/<lessonId>/`.

Вибери `lessonId` у kebab-case (`numbers-quiz`). Він стане ім'ям JSON, теки кліпу й адресою `/lesson/<lessonId>`.

Права: для публічного запуску потрібне власне або ліцензоване відео. Чужі ролики з TikTok краще підключати через тип `tiktok` (див. README).

## 2. Подивись, як влаштоване відео

```bash
scripts/clip-sheet.sh media/source/lesson6.mp4                  # усе відео, кадр кожні 2 с
```

На кожному кадрі видно секунду. Знайди повторюваний шаблон, наприклад «питання → таймер/відлік → відповідь на екрані й у звуці». Від нього залежить, де ставити паузи і що вирізати.

## 3. Знайди точні таймінги

Для кожного питання потрібні три моменти в секундах оригіналу:

| Позначення | Що це | Як знайти |
|---|---|---|
| **Q** | кінець питання (мовлення) | `silencedetect` або розшифровка |
| **V** | відповідь з'являється на екрані | аркуш кадрів 5 fps навколо моменту |
| **A** | відповідь звучить | `silencedetect` або розшифровка |

Кадри навколо відповіді (тут 12–15 с, 5 кадрів за секунду):

```bash
scripts/clip-sheet.sh media/source/lesson6.mp4 12 3 5 /tmp/sheet.png
```

Межі мовлення (кожен `silence_end` означає, що почався звук):

```bash
ffmpeg -hide_banner -i media/source/lesson6.mp4 -af silencedetect=n=-32dB:d=0.3 -f null - 2>&1 | grep silence_
```

Розшифровка зі словами й часом (необов'язково, але дуже допомагає). Працює локально, модель (~1.5 ГБ) завантажується один раз:

```bash
uv venv -p 3.12 ~/.venvs/whisper && uv pip install -p ~/.venvs/whisper/bin/python faster-whisper
HF_HUB_DISABLE_XET=1 ~/.venvs/whisper/bin/python - media/source/lesson6.mp4 <<'PY'
import sys, subprocess, numpy as np
from faster_whisper import WhisperModel
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[1], '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True, check=True).stdout
segs, _ = WhisperModel('medium', compute_type='int8').transcribe(np.frombuffer(raw, np.float32), word_timestamps=True)
for s in segs:
    print(' '.join(f'{w.start:.2f}|{w.word.strip()}' for w in s.words))
PY
```

`HF_HUB_DISABLE_XET=1` потрібен, бо без нього завантаження моделі може зависнути. Час першого слова в кожному сегменті Whisper часто ставить зарано, тож звіряй його із `silencedetect` і кадрами.

## 4. Вибери тип паузи

| `kind` | Коли | Що бачить користувач |
|---|---|---|
| `nextWord` | треба вгадати слово, яке прозвучить далі | «Un café con ___» |
| `answer` | відео ставить питання (картинка, переклад, вибір із варіантів) | завдання й пропуск |
| `repeat` | слово вже прозвучало і зараз прозвучить удруге | підказка (перша літера й переклад) відкрита одразу |

Додатково:

- `"showTranslation": true` показує переклад відповіді як завдання: «boy → _ _ _ _ _». Для `repeat` це увімкнено завжди. В іспанському інтерфейсі перекладу немає.
- Якщо відео показує варіанти внизу кадру, панель відповіді їх закриє. Тоді повтори варіанти в `context`: `"¿Carne, queso o pan?"`.
- `accept` містить інші прийнятні відповіді в нормалізованому вигляді: нижній регістр, без наголосів і пунктуації (`"si"`, `"frutas"`).
- `maxAttempts`: 2 для простих вікторин, 3 для `repeat` і фраз.

## 5. Порахуй паузи й вирізи

**Пауза (`pauseAt`)** ставиться приблизно за 0.15–0.25 с до `min(V, A)`. На кадрі паузи відповіді ще не має бути ні на екрані, ні в звуці. Для `repeat` пауза йде одразу після першого повтору слова, до другого.

**Очікування (відлік 3-2-1, смужка таймера, «підпишись на канал»)** вирізаємо: `--cut A-B` у секундах оригіналу. Звичайний виріз для питання з таймером: від `Q + 0.4` до `pauseAt − 0.3`. Так лишаються кінець питання й частка секунди таймера перед паузою, і склейку не видно.

Обмеження:

- Між останньою паузою і кінцем кліпу має лишатися щонайменше 0.5 с. Якщо кінцівку вирізаєш повністю, залиш хвіст.
- Не ріж посеред слова. Перевір `silencedetect`, що межі вирізу припадають на тишу або на відлік.

## 6. Закодуй кліп

Додай рядок у [scripts/build-real-clips.sh](../scripts/build-real-clips.sh), щоб кліп можна було перезібрати:

```bash
scripts/encode-clip.sh --cover-at 1 --cut 2.05-3.9 --cut 6.15-7.95 media/source/lesson6.mp4 numbers-quiz
```

і запусти його. Скрипт робить 720×1280 H.264 + AAC з `faststart`, кладе `video.mp4` і `cover.jpg` у `public/clips/numbers-quiz/` і друкує тривалість. `--cover-at` береться в секундах **вирізаного** кліпу. Якщо файл більший за 8 МБ, додай `--crf 26`.

## 7. Перерахуй часи під вирізаний кліп

Після вирізів усі часи зсуваються. Переведи кожен `pauseAt` і межі субтитрів:

```bash
node scripts/shift-times.mjs --cut 2.05-3.9 --cut 6.15-7.95 4.2 8.25 0.2 1.65
# 4.2 → 2.35
# 8.25 → 4.6 ...
```

Передавай ті самі `--cut`, що й у кроці 6.

## 8. Створи JSON уроку

`src/mocks/lessons/numbers-quiz.json`:

```json
{
  "id": "numbers-quiz",
  "title": { "en": "Numbers", "uk": "Числа", "es": "Los números" },
  "description": { "en": "…", "uk": "…", "es": "…" },
  "targetLanguage": "es",
  "level": "A1",
  "durationSec": 35,
  "cover": "/clips/numbers-quiz/cover.jpg",
  "video": { "type": "file", "src": "/clips/numbers-quiz/video.mp4" },
  "cues": [
    { "start": 0.2, "end": 1.65, "es": "¿Cómo se dice «one»?", "tr": { "en": "How do you say “one”?", "uk": "Як іспанською «один»?" } },
    { "start": 2.35, "end": 3.15, "es": "Uno.", "tr": { "en": "One.", "uk": "Один." } }
  ],
  "gaps": [
    {
      "id": "uno",
      "kind": "answer",
      "pauseAt": 2.35,
      "context": "",
      "answer": "uno",
      "translation": { "en": "one", "uk": "один" },
      "showTranslation": true,
      "maxAttempts": 2
    }
  ]
}
```

Правила для субтитрів (`cues`):

- Кожен рядок має `es` і переклади `tr.en` і `tr.uk`. Якщо відео говорить англійською, в `es` пиши іспанську версію фрази.
- Рядок, видимий у момент паузи, не має містити відповідь. Найпростіше: рядок перед паузою закінчується до `pauseAt`, а рядок з відповіддю починається рівно з `pauseAt`.
- `durationSec` береться з виводу кроку 6 (округлений).

Далі:

- Додай картку в `src/mocks/lessons/index.json`: `id`, `title`, `description`, `level`, `durationSec`, `cover`, `addedAt` (дата додавання). Стрічка йде від найновіших, з однаковою датою — у порядку файлу. Картка з `"pinned": true` завжди перша.
- Додай урок у список `PLAYABLE` у [src/api/lessons.test.ts](../src/api/lessons.test.ts).
- Необов'язково: лічильники й коментарі для колонки дій у `src/mocks/social/stats.json` і `comments.json`. Без них показуються нулі.

## 9. Перевір

```bash
npm test          # дані уроку, субтитри на паузах, файли кліпу й faststart
npm run lint
npm run build
```

Кадр точно в момент кожної паузи (відповіді на ньому не має бути):

```bash
ffmpeg -v error -ss 2.30 -i public/clips/numbers-quiz/video.mp4 -frames:v 1 /tmp/pause.png
```

Тут `2.30` означає `pauseAt − 0.05`, бо плеєр зупиняється на `PAUSE_LEAD` раніше.

І вручну: `npm run dev`, відкрий `/lesson/numbers-quiz` у вікні 360×800. Пройди всі паузи і перевір таке:

- відео стає саме перед відповіддю;
- після «¡Muy bien!» відповідь звучить і з'являється;
- панель відповіді не закриває того, що потрібно для відповіді;
- урок доходить до екрана результатів.

## Коротко

1. Оригінал у `media/source/`.
2. `clip-sheet.sh` і `silencedetect` (за бажання Whisper): знайти Q, V, A для кожного питання.
3. `pauseAt` ≈ `min(V, A) − 0.2`, вирізи від `Q + 0.4` до `pauseAt − 0.3`.
4. Рядок у `build-real-clips.sh` і його запуск.
5. `shift-times.mjs` для всіх часів.
6. JSON уроку, картка в `index.json`, урок у `PLAYABLE`.
7. `npm test`, lint, build, кадри пауз, прогін на 360×800.
