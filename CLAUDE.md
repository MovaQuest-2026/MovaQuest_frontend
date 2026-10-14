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

## Контент і діалоги (ink)
- Сценарії діалогів лежать у content/ink/: <dialogueId>.uk.ink і
  <dialogueId>.en.ink, спільні змінні — _variables.ink, метадані —
  dialogues.meta.json.
- `npm run ink` (scripts/build-ink.mjs) компілює їх у
  src/mocks/dialogues/<id>.ink.json. Ці JSON-файли руками не редагуємо,
  тільки перегенеровуємо скриптом.
- Контракт змінних і тегів — docs/ink-contract.md. Імена змінних і тегів
  не міняємо без оновлення цього документа.

## Збереження прогресу
- useGameStore обгорнутий у persist (zustand/middleware), ключ
  localStorage — `movaquest-save-v1`.
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
