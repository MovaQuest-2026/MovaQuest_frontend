# Movaquest — мовна RPG-гра

## Стек
- Frontend: Vite + React 18 + TypeScript
- State management: Zustand
- Game engine: Phaser 3 (world-шар — рух персонажа, tilemap, колізії)
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

## Правило моків
Усі дані з mocks/ мають проходити через функції в api/ (наприклад
getCityConfig(), getDialogue(), getExercises()), а НЕ імпортуватись
напряму в компоненти. Коли бекенд буде готовий, міняється тільки
реалізація функцій в api/ — компоненти залишаються незмінними.

## Конвенції коду
- Компоненти — функціональні, з TypeScript-типами пропсів (без PropTypes)
- Іменування файлів компонентів — PascalCase, файлів утиліт — camelCase
- Тести (де є) — поруч з файлом, суфікс .test.ts(x)
