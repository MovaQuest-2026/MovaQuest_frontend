# Movaquest — мовна RPG-гра

## Стек
- Frontend: Vite + React 18 + TypeScript
- State management: Zustand
- Game engine: Phaser 4 (world-шар — рух персонажа, tilemap, колізії)
- Діалоги: inkjs (сценарії від контент-автора, скомпільовані в JSON)
- i18n: react-i18next (English / Українська)
- Backend (окремий репозиторій/пакет): FastAPI (Python), Firebase (Auth + Firestore), py-fsrs
- Аналітика: PostHog
- Деплой frontend: Vercel

## Архітектура
- World-шар (Phaser) відповідає ТІЛЬКИ за рух персонажа, tilemap, колізії,
  detection зон взаємодії з NPC. НІКОЛИ не рендерить UI (діалоги, вправи,
  меню) всередині Phaser-канвасу.
- UI-шар (React) рендериться як overlay поверх Phaser-канвасу через
  position: absolute. Реагує на зміни в Zustand-сторі.
- Комунікація між шарами — ТІЛЬКИ через Zustand-стор (useGameStore).
  Phaser-сцени викликають useGameStore.setState(), React-компоненти
  підписуються через useGameStore(selector). Ніяких прямих
  callback-пропсів між Phaser і React.

## Структура папок
src/
  game/           — Phaser-сцени, конфігурація гри
  components/     — React UI-компоненти (DialogueBox, VocabCard, тощо)
  store/          — Zustand-стори
  mocks/          — фікстурні дані, що імітують майбутній API
  api/            — шар доступу до даних (зараз читає з mocks/, пізніше — fetch)
  i18n/           — переклади інтерфейсу
  landing/        — лендінг на роуті `/` (Tailwind v4, власний landing.css)

## Роути і лендінг
- `/` — лендінг (src/landing/LandingPage.tsx), `/play` — StartScreen гри,
  далі `/language`, `/world/:cityId`, `/credits`.
- Tailwind підключений тільки для лендінгу: landing.css імпортує лише theme
  і utilities (без preflight) і сканує тільки src/landing. Глобальний
  index.css обгорнутий у `@layer legacy`, тож утиліти лендінгу його
  перекривають, а scoped-reset лежить під `.landing-root`. Стилі гри
  лендінг не зачіпає — нові глобальні стилі гри теж пишемо в `@layer legacy`.

## Рівні
- Кожен рівень — окреме місто в src/mocks/cities/ і запис у src/mocks/levels.json
  (читається через src/api/getLevels.ts). Перший (`order: 1`, `main: true`) —
  `picnic` («Пікнік у парку», демо на 3–5 хв, сценарій у scene-01-park-picnic.md).
- Старт (`/play` → «Почати») веде одразу в `/levels/picnic`. Роути: `/levels` — вибір рівня, `/levels/:levelId` — прямий вхід (продовжує
  збереження рівня або починає заново через `startLevel`; без мови веде на
  `/language?next=...`). `/world/:cityId` — сам світ.
- `startLevel(cityId)` скидає прогрес рівня, але лишає мову і `learnedWords`.
- Місто з `completion: 'level'` після `ending:` показує LevelCompleteScreen
  замість «Щоденника дня»; `startClock` задає стартовий час нової гри.

## Контент і діалоги (ink)
- Сценарії діалогів лежать у content/ink/: <dialogueId>.uk.ink і
  <dialogueId>.en.ink, спільні змінні — _variables.ink, метадані —
  dialogues.meta.json.
- `npm run ink` (scripts/build-ink.mjs) компілює їх у
  src/mocks/dialogues/<id>.ink.json. Ці JSON-файли руками не редагуємо,
  тільки перегенеровуємо скриптом.
- Тимчасові тайлмапи зон генерує `npm run maps:placeholder`
  (scripts/gen-placeholder-maps.mjs) у public/tilemaps/ з vinnytsia.json:
  з тайлів Kenney, якщо паки лежать у public/assets/kenney/, інакше
  прямокутники. Мапи з Tiled (без властивості `generated`) генератор не
  перезаписує. Об'єкти шарів `doors`/`exits` з властивістю `id` у Tiled
  перекривають координати дверей і виходів з конфігу.

## Графіка
- Асети: public/assets/kenney/ (тайли, CC0), public/assets/lpc/<id>.png
  (персонажі, кадр 64×64, стандартна розкладка LPC), public/assets/landmarks/<id>.png.
  Відсутній асет не ламає гру: персонажі стають плейсхолдерами, landmark не показується.
- Спрайт NPC — поле `sprite` у конфігу NPC, гравець — public/assets/lpc/player.png.
- Сцени: WorldScene (outdoor), InteriorScene (interior), TransportScene
  (transport, фон за вікнами) на спільній основі ZoneSceneBase.
- Конфіг зони: `triggers` (вхід у прямокутник ставить прапорець), вихід з
  `target` = поточна зона — телепорт у межах зони, `lockedHint` — i18n-ключ
  підказки біля закритого виходу. У квест-лінії `dialogueEffects` ставлять
  прапорці після будь-якого діалогу незалежно від кроку.
- NPC з `outfit` використовує спрайт public/assets/lpc/<outfit>.png; без нього —
  кольоровий плейсхолдер за одягом (червоний/синій/жовтий/зелений, окуляри).
- Статичні персонажі: public/assets/characters/<id>.png (один кадр, нативний піксель, не масштабувати).
  Пріоритет вигляду NPC: `character` > `outfit` > `sprite` (LPC) > плейсхолдер; `invisible` — без спрайта.
  Гравець — `playerCharacter` міста (зараз `hero`), інакше LPC `player`.
- Зона з `background` (public/assets/backgrounds/<image>.png) замість `tilemap`: світ = width×height,
  колізії — `colliders`, zoom цілий (`computeZoom` у ZoneSceneBase). Підгонка colliders — physics debug у DebugPanel.
- Старт за мовою: `startZoneByLanguage` (en → glade о 08:00, uk → bus_station з `left_glade`).
  Вихід з `confirm` ставить `pendingExit` у стор; ConfirmTravelDialog викликає confirm/cancelPendingExit.
  Крок квесту з `skipWhen` закривається без completeEffects і advanceClockTo.
- Аудіо необов'язкове: public/audio/fountain.mp3 грає в кат-сцені фонтану,
  якщо файл є (перевірка HEAD-запитом).
- Кінець гри: прапорці `game_finished` і `ending`; WorldScreen тоді показує
  DayJournalScreen. Подія PostHog `ending_reached({ ending, trust })`.

## Аналітика і dev-інструменти
- Події PostHog — тільки через функції в src/api/analytics.ts (додають
  `cityId` і `nativeLanguage`), лише ідентифікатори, без ink-текстів.
  Список подій і готові інсайти — docs/analytics.md.
- Phaser не викликає аналітику напряму: сцена пише подію в стор
  (наприклад, `markDoorEntered`), а useAnalytics у WorldScreen її надсилає.
- Мобільне керування: VirtualJoystick пише `joystick` у стор (тільки на
  `pointer: coarse`), сцена додає його до клавіатурного вводу.
- DebugPanel (клавіша `) — тільки в dev: підключається через
  `import.meta.env.DEV ? lazy(...) : null`, стилі інлайн, у бандл не потрапляє.
- Нові асети записуємо в public/CREDITS.md (екран «Ліцензії» читає саме його).
- Контракт змінних і тегів — docs/ink-contract.md. Імена змінних і тегів
  не міняємо без оновлення цього документа.

## Збереження прогресу
- useGameStore обгорнутий у persist (zustand/middleware), ключ
  localStorage — `movaquest-save-v2` (v1 прибирається при старті).
- Зберігаються тільки поля з partialize: nativeLanguage, currentCity,
  flags, questStep, gameClock, currentZone, spawn, inventory,
  learnedWords. Тимчасовий стан (activeDialogue, activeExercise,
  interactionHint) не зберігається.
- Якщо формат збереження змінюється несумісно, міняємо ключ
  (movaquest-save-v2) або додаємо version/migrate.

## Правило моків
Усі дані з mocks/ мають проходити через функції в api/ (наприклад
getCityConfig(), getDialogue(), getExercises()), а НЕ імпортуватись
напряму в компоненти. Коли бекенд буде готовий, міняється тільки
реалізація функцій в api/ — компоненти залишаються незмінними.

## Конвенції коду
- Компоненти — функціональні, з TypeScript-типами пропсів (без PropTypes)
- Іменування файлів компонентів — PascalCase, файлів утиліт — camelCase
- Тести (де є) — поруч з файлом, суфікс .test.ts(x)
