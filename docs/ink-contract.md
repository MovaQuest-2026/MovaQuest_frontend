# Ink-контракт MovaQuest

Документ для контент-автора і фронтенду. Якщо щось тут змінюється, змінюється одночасно в `content/ink/_variables.ink`, у сторі (`flags`) і в цьому файлі.

## Файли

- `content/ink/<dialogueId>.uk.ink` і `content/ink/<dialogueId>.en.ink` — дві незалежні версії одного діалогу.
- `content/ink/_variables.ink` — спільні змінні. Кожен діалог починається з `INCLUDE _variables.ink`, тому список змінних в обох мовах завжди однаковий.
- `content/ink/dialogues.meta.json` — `npcId`, зона і словник для кожного діалогу.
- `src/mocks/quizzes/<quizId>.json` — вправи, на які посилаються теги `quiz:`.

Компіляція всіх діалогів:

```bash
node scripts/build-ink.mjs
```

Скрипт пише `src/mocks/dialogues/<id>.ink.json` у форматі, який читає `getDialogue()`, і падає, якщо в uk і en різні набори тегів `quiz:`. Inky можна використовувати для перевірки окремого файлу (File → Export to JSON), але в репозиторій ідуть тільки файли зі скрипта.

## Мови

- uk-версія: повністю українською.
- en-версія: оповідь англійською, ключові українські слова й фрази в «ялинках» з перекладом. Варіанти відповіді гравця пишемо українською з перекладом у дужках: `* [Мій телефон розрядився. (My phone died.)]`.

## Звертання і рід

- Інтерфейс і цілі квесту звертаються до гравця на "ти".
- Незнайомі дорослі NPC кажуть гравцю "ви" (касирка, продавчиня, кондукторка, працівниця музею, турист). Однолітки і старші знайомі кажуть "ти" (Остап, Соломія, бабуся Ніна, пані Галина, музикант, художник). Це частина навчання ввічливості.
- Гравець без статі: жодних форм минулого часу й прикметників, що виказують рід ("знайшов", "уважним"). Замість цього теперішній час або звертання "дитино".

## Змінні

| Змінна | Тип | Хто ставить | Навіщо |
| --- | --- | --- | --- |
| `trust` | int | ink | лічильник довіри міста, визначає кінцівку |
| `quiz_ok` | bool | фронт | результат останньої вбудованої вправи |
| `polite` | bool | ink | гравець хоч раз відповів ввічливо |
| `phone_charging` | bool | ink | акт 1, касирка |
| `helped_nina` | bool | ink | акт 1, сумка |
| `helped_tourist` | bool | ink | акт 2, реверс-квест |
| `task_flowers` | bool | ink | справа 1 |
| `task_show_time` | bool | ink | справа 2 |
| `task_dessert` | bool | ink | справа 3 |
| `stop_ok` | bool | ink | акт 3, правильна зупинка |
| `pirogov_asked` | bool | ink | Остап уже питав |
| `knows_pirogov` | bool | ink | правильна відповідь про Пирогова |
| `has_umbrella` | bool | ink | парасолька від пані Галини |
| `has_drawing` | bool | ink | малюнок від художника |

Фронт перед стартом діалогу записує в `story.variablesState` поточні значення з `flags`, а через `story.ObserveVariable` забирає зміни назад.

## Теги

Тег стоїть у кінці рядка, до якого належить. На одному рядку може бути кілька тегів: `Дивись! Фонтан! # clock:20:00 # cutscene:fountain`.

| Тег | Що робить фронт |
| --- | --- |
| `speaker:<npcId>` | показує ім'я і портрет; діє до наступного `speaker:` |
| `quiz:<quizId>` | показує рядок, ставить діалог на паузу, відкриває вправу, пише `quiz_ok`, потім продовжує |
| `give:<item>` / `take:<item>` | змінює інвентар в UI; логіка гри все одно спирається на змінні |
| `clock:<HH:MM>` | пересуває ігровий час |
| `flag:<name>` | ставить `flags[name] = true` для прапорців, яких немає серед змінних ink (`exit_bus_station`, `shortcut_open`, `park_route_known`, `know_outfit`) |
| `cutscene:<id>` | після закриття діалогу запускає кат-сцену (`fountain`) |
| `ending:<best\|good\|basic>` | після закриття діалогу показує екран "Щоденник дня" з цією кінцівкою |

## Прапорці, які ставить квест

Ці прапорці не є змінними ink і не ставляться тегами: їх пише квест-двигун з `startEffects` / `completeEffects` у `src/mocks/quests/vinnytsia_main.json`.

| Прапорець | Коли | Що робить фронт |
| --- | --- | --- |
| `rain_started` | старт кроку `wait_rain` (після покупки квітів) | дощ у зовнішніх зонах, NPC з `patrol: true` ховаються, під'їзд `door_entrance` відкривається |
| `rain_over` | кінець кроку `wait_rain` (після діалогу `vysh_galyna`) | дощ минає, NPC повертаються |
| `trolley_announced` | кінець кроку `ride` (після діалогу `trolley_passenger`) | тролейбус зупиняється, відкривається `exit_soborna` або `exit_park` залежно від `stop_ok` |

## Як працює `quiz:`

Фронт викликає `story.Continue()` по одному рядку. Якщо в `story.currentTags` є `quiz:<id>`, рядок показується, кнопка "Далі" замінюється карткою вправи з `getQuiz(id)`. Після відповіді фронт ставить `story.variablesState.quiz_ok = true | false` і продовжує. Тому умова `{ quiz_ok: ... }` у ink має йти одразу після рядка з тегом.

```ink
Ну що, перевіримо? Ким був Пирогов? # quiz:pirogov_1
~ pirogov_asked = true
{ quiz_ok:
    Точно! Ти уважно слухаєш.
    ~ knows_pirogov = true
- else:
    Не зовсім. Він був хірургом.
}
-> END
```

## Список діалогів

| Акт | `dialogueId` | NPC | Зона | Вправа |
| --- | --- | --- | --- | --- |
| 1 | `bus_cashier` | касирка | `bus_station_hall` | `bus_charge_1` |
| 1 | `bus_nina` | бабуся Ніна | `bus_station` | `bus_bag_1` |
| 1 | `bus_guard` | охоронець | `bus_station` | — |
| 2 | `vysh_flowers` | продавчиня квітів | `flower_kiosk` | `vysh_price_1` |
| 2 | `vysh_galyna` | пані Галина | `galyna_flat` | `vysh_polite_1` |
| 2 | `vysh_tourist` | турист | `vyshenka` | `vysh_directions_1` |
| 3 | `trolley_conductor` | кондукторка | `trolleybus` | `trolley_card_1` |
| 3 | `trolley_passenger` | пасажир | `trolleybus` | `trolley_stop_1` |
| 3 | `park_musician` | музикант | `park` | — |
| 4 | `center_tower` | працівниця музею | `tower_interior` | `tower_time_1` |
| 4 | `center_ostap` | Остап | `center` | `pirogov_1` |
| 4 | `vinnytsia_cafe` | бариста | `cafe` | `cafe_describe_1` |
| 4 | `center_artist` | художник | `center` | — |
| 5 | `emb_phone` | повідомлення в телефоні | `embankment` | `emb_find_1` |
| 5 | `emb_crowd` | люди в натовпі | `embankment` | — |
| 5 | `emb_solomiia` | Соломія | `embankment` | — |

## Перед релізом

Факти про Пирогова, вежу з годинником і швейцарські трамваї звірити з сайтами музею-садиби Пирогова та міста. У JSON вправи для цього є поле `_source`.
