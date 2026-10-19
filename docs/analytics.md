# Аналітика MovaQuest (PostHog)

Усі події надсилаються через `src/api/analytics.ts`. Кожна подія має властивості `cityId` (зараз `vinnytsia`) і `nativeLanguage` (`en` / `uk`). Події містять тільки ідентифікатори: тексти з ink не надсилаються.

Без `VITE_POSTHOG_KEY` у `.env` аналітика вимкнена, і гра нічого не надсилає.

## Події

| Подія | Властивості | Коли |
| --- | --- | --- |
| `zone_entered` | `zoneId`, `gameClock` | гравець перейшов у зону (зокрема стартову в новій грі); після F5 не надсилається |
| `door_entered` | `doorId`, `zoneId` | гравець зайшов у двері; `zoneId` — зона, де ці двері (id `door_out` повторюються) |
| `quest_step_completed` | `stepId`, `msSinceStart` | крок основного квесту завершено; `msSinceStart` — мілісекунди від старту квесту в цьому збереженні |
| `travel_confirmed` | `fromZone`, `toZone`, `stationsDone`, `alphaScore` | гравець підтвердив переїзд у вікні підтвердження (галявина → Вінниця); `stationsDone` — станцій абетки з 3, `alphaScore` — правильних відповідей з 9 |
| `travel_cancelled` | `fromZone`, `stationsDone` | гравець натиснув «Ще ні» у вікні підтвердження |
| `quiz_answered` | `quizId`, `correct` | відповідь на вбудовану вправу в діалозі (тег `quiz:`) |
| `dialogue_finished` | `dialogueId` | гравець закрив діалог після `END` |
| `ending_reached` | `ending`, `trust` | після кат-сцени фонтану; `ending` — `best` / `good` / `basic` |
| `session_resumed` | `zoneId`, `questStep` | світ відкрито зі збереження (раз на завантаження сторінки) |
| `lesson_started`, `lesson_completed`, `exercise_answered` | `dialogueId`, `score`, `questionId`, `correct` | старі події з першого прототипу: старт діалогу, екран результатів, вправи після діалогу |

Порядок кроків `vinnytsia_main` (`src/mocks/quests/vinnytsia_main.json`):
`charge_phone` → `leave_station` → `buy_flowers` → `wait_rain` → `take_trolleybus` → `ride` → `show_time` → `dessert` → `go_embankment` → `find_solomiia`.

## Воронка «приїзд → фонтан»

1. **Product analytics → New insight → Funnels.**
2. Додай 10 кроків. Кожен крок — подія `quest_step_completed` з фільтром `stepId = <id>`, у порядку зі списку вище. Назви кроки так само, як `stepId`, щоб графік читався без легенди.
3. Останнім кроком можна додати `ending_reached`, щоб бачити, хто дійшов до кінцівки, а не лише до Соломії.
4. **Aggregating by:** Unique users. **Conversion window:** 1 день (одна гра триває 20–40 хвилин; F5 і повернення того ж дня лишаються в межах).
5. **Filters:** `cityId = vinnytsia`. Внутрішні проходи відфільтруй за `$host` (наприклад, `$host` не дорівнює `localhost:5173`).
6. **Breakdown:** `nativeLanguage` — порівняння англомовних і україномовних гравців.
7. Для часу проходження відкрий **Time to convert** у тій самій воронці, або Trends → `quest_step_completed` → *Property value* `msSinceStart` → *Median*, з breakdown за `stepId`.

Де дивитися на відтік: найбільший спад між сусідніми кроками. Якщо гравці кидають гру між `charge_phone` і `leave_station`, варто подивитися `door_entered` (чи знаходять вихід із зали) і `zone_entered` у ці хвилини.

## Частка правильних відповідей за `quizId`

1. **New insight → Trends.**
2. Серія **A**: подія `quiz_answered`, фільтр `correct = true`, агрегація *Total count*.
3. Серія **B**: подія `quiz_answered` без фільтра, *Total count*.
4. Увімкни **Formula**: `A / B * 100`.
5. **Breakdown by:** `quizId`.
6. Тип графіка: **Bar chart** (або *Table*), діапазон — уся тривалість тесту, *Compare to previous period* вимкнено.

Вправи з часткою нижче ~50% — кандидати на спрощення або кращу підказку в діалозі. Для таких вправ додай breakdown за `nativeLanguage`. Якщо помиляються лише англомовні гравці, варто переглянути en-версію відповідного ink-файлу.

## Перевірка без справжнього PostHog

Для локальної перевірки запусти dev-сервер з фіктивним ключем і локальним хостом і перехоплюй запити на `/ph/` у DevTools (вкладка Network):

```bash
VITE_POSTHOG_KEY=phc_local_test VITE_POSTHOG_HOST=http://localhost:5173/ph npm run dev
```

PostHog не надсилає події з автоматизованих браузерів (headless, `navigator.webdriver`). Для ручної перевірки використовуй звичайний браузер.
