# Що потрібно від бекенду

Стан на 17.11.2026, гілка `feat/video-gap-fill`. Документ для того, хто проєктує й пише бекенд MovaQuest. У ньому описано, що застосунок уже вміє, що з цього зараз мок або живе тільки в браузері і що треба перенести на сервер.

**Вирішено:**

- **Відео лишаються на фронтенді.** Кліпи, обкладинки, каталог і JSON уроків з паузами й субтитрами лежать у репозиторії й деплояться разом із фронтом на Vercel. Бекенд їх не зберігає й не віддає.
- **Автентифікація на бекенді.** Реєстрація, вхід (email + пароль, Google), сесії й облікові записи.

Решта (профіль, прогрес, лайки, коментарі, розпізнавання мови) нижче розкладена за пріоритетом.

---

## 1. Як фронтенд ходить по дані

Компоненти не звертаються до мережі напряму. Усі дані йдуть через функції в `src/api/*.ts`. Зараз ці функції повертають моки: частину даних беруть з localStorage браузера через `src/api/mockDb.ts`, частину з JSON у `src/mocks/`. Щоб підключити бекенд, ці функції переписують на `fetch`, а типи й компоненти лишаються як є.

Тому найзручніше, якщо API повертає дані у формі, близькій до наявних типів (`src/types/*.ts`). Нижче вони наведені для кожного розділу.

## 2. Огляд: що є і де воно живе

| Функціонал | Де в коді | Зараз | Потрібно від бекенду | Пріоритет |
|---|---|---|---|---|
| Реєстрація й вхід email + пароль | `src/api/auth.ts` | мок, облікові записи в localStorage | так | **P0** |
| Вхід через Google | `src/api/googleAuth.ts` | Google Identity Services у браузері, профіль без перевірки | так (перевірка токена, акаунт) | **P0** |
| Сесія, вихід | `account` у `useUserStore`, `signOut()` | локально | так | **P0** |
| Профіль з онбордингу (мова, рівень, мета) | `src/api/profile.ts` | мок у localStorage | так | **P0** |
| Розпізнавання голосової відповіді | `src/api/evaluateAnswer.ts` | мок (випадковий результат) | так (STT) | **P1** |
| Прогрес: пройдені уроки, результати, вивчені слова | `completedLessons`, `learnedWords` у `useUserStore` | тільки браузер, лише для акаунта | так (§6) | **P1** |
| Незавершені уроки (продовжити з паузи) | `activeLessons` у `useUserStore` | тільки браузер, спільні для всіх на пристрої | так (§6) | **P1** |
| Лайки й збережені уроки (свої) | `likedLessons`, `savedLessons` + `setLessonLiked/Saved()` | тільки браузер, API-функції порожні | так | **P1** |
| Лічильники під відео (лайки, коментарі, збереження, поширення) | `getLessonStats()` у `src/api/social.ts` | мок JSON | так | **P2** |
| Коментарі | `getComments()`, `postComment()` | мок JSON + пам'ять вкладки | так | **P2** |
| Поширення (лічильник) | `recordShare()` | пам'ять вкладки | так | **P2** |
| Аналітика | `src/api/analytics.ts` | PostHog напряму з браузера | ні (див. §9) | — |
| Каталог і уроки (відео, субтитри, паузи) | `getLessons()`, `getLesson()` | JSON у репозиторії | **ні**, за рішенням | — |
| Перевірка набраної відповіді | `matchAnswer()` | у браузері | ні | — |
| Тема, мови субтитрів, швидкість відео, дозвіл мікрофона | `useUserStore` | браузер | ні (налаштування пристрою) | — |

P0 потрібне для запуску з акаунтами, P1 для того, щоб прогрес не губився між пристроями, P2 для соціальних функцій.

---

## 3. P0 — Автентифікація

### Що є у фронтенді

- **Сторінка `/auth`** має вкладки «Реєстрація» і «Вхід», кнопку «Увійти через Google» і кнопку «Не зараз». Вхід **необов'язковий**: відео відкривається без акаунта. Увійти можна з картки в профілі або з підказки над відео.
- **Після реєстрації або першого входу через Google** відкривається онбординг (§4). Якщо в акаунта вже є профіль, онбординг пропускається.
- **Вихід** у профілі: людина лишається в застосунку як гість.

### Типи

```ts
// src/types/account.ts
interface Account {
  id: string
  email: string
  name: string
  provider?: 'password' | 'google'
}
```

### Потрібні ендпоінти

| Метод | Шлях | Тіло | Відповідь |
|---|---|---|---|
| POST | `/api/auth/sign-up` | `{ name, email, password }` | `Account` + сесія |
| POST | `/api/auth/sign-in` | `{ email, password }` | `Account` + сесія |
| POST | `/api/auth/google` | `{ idToken }` або `{ code }` (див. нижче) | `Account` + сесія |
| POST | `/api/auth/sign-out` | — | 204 |
| GET | `/api/auth/me` | — | `Account` або 401 |
| DELETE | `/api/account` | — | 204 (видалення акаунта й усіх даних) |

### Правила валідації, на які вже розрахований фронт

Фронт показує повідомлення за кодом помилки. Бажано, щоб API повертав ці самі коди:

| Код | Коли |
|---|---|
| `nameRequired` | порожнє ім'я при реєстрації |
| `invalidEmail` | email не схожий на email |
| `weakPassword` | пароль коротший за **6** символів (`PASSWORD_MIN_LENGTH`) |
| `emailTaken` | email уже зареєстровано (порівняння без урахування регістру, з обрізаними пробілами) |
| `wrongCredentials` | неправильний email **або** пароль: одна помилка для обох випадків, щоб не розкривати, чи існує email |
| `googleFailed` | не вдалося перевірити Google-токен |

`googleUnavailable` і `googleCancelled` фронт визначає сам, бекенду вони не потрібні.

Пропонований формат помилки: `4xx` з тілом `{ "error": { "code": "emailTaken", "message": "…" } }`.

### Google

Зараз фронт отримує access token через Google Identity Services у спливному вікні (`initTokenClient`, scope `openid email profile`) і сам читає профіль з `https://www.googleapis.com/oauth2/v3/userinfo`. Такому профілю не можна довіряти на сервері. Потрібно:

1. Бекенд перевіряє токен від Google: ID token через `google-auth-library` або authorization code flow.
2. Бекенд створює або знаходить акаунт за Google `sub` і повертає сесію.
3. Обидві сторони домовляються, що фронт передає: ID token (тоді фронт перейде на `google.accounts.id`) чи authorization code (`initCodeClient`). Від цього залежить невелика зміна в `src/api/googleAuth.ts`.

`VITE_GOOGLE_CLIENT_ID` на фронті й client secret на бекенді мають належати одному OAuth-клієнту в Google Cloud. В «Authorized JavaScript origins» треба додати `http://localhost:5173` і домен Vercel.

Що робити, якщо email з Google збігається з уже зареєстрованим email-акаунтом (об'єднувати чи ні), вирішує бекенд. Фронту достатньо отримати `Account`.

### Сесія

Будь-який стандартний варіант підходить. Фронт зберігає лише `Account` і питає `/api/auth/me` при запуску. Рекомендація: httpOnly cookie з `SameSite=None; Secure`, бо фронт і бекенд на різних доменах. Тоді фронт ходить з `credentials: 'include'`, а бекенд налаштовує CORS на домен Vercel і localhost. Bearer-токен теж можливий, але тоді його треба ще й зберігати й оновлювати на фронті.

### Анонімний id

Кожен браузер має свій `userId` (UUID у `useUserStore`). Його використовує PostHog як distinct id, а `getAnonymousUser()` в `src/api/auth.ts` був задуманий під anonymous sign-in. Якщо бекенд хоче пов'язати поведінку гостя з акаунтом після реєстрації, фронт може передати цей `userId` у `sign-up` або `sign-in` (поле `anonymousId`). Це необов'язково.

---

## 4. P0 — Профіль користувача (онбординг)

### Що є у фронтенді

Онбординг (`/onboarding`) має три кроки: мова інтерфейсу, рівень і мета поїздки, дозвіл на мікрофон.

- Після завершення фронт викликає `saveProfile`. Дозвіл на мікрофон у профіль **не йде**, бо він свій на кожному пристрої.
- Після входу фронт викликає `getProfile`. Профілю немає → онбординг. Профіль є → налаштування застосовуються, онбординг пропускається.
- Незавершений онбординг (акаунт є, профілю немає) відкривається знову на будь-якій сторінці, доки його не пройдуть.
- Зміни мови, рівня чи мети в профілі фронт надсилає через `updateProfile` із затримкою 0.8 с.

### Типи

```ts
// src/types/profile.ts
interface UserProfile {
  accountId: string
  interfaceLanguage: 'en' | 'uk' | 'es'
  level: 'A1' | 'A2' | 'B1' | 'B2'
  goal: string          // може бути порожнім, до 200 символів, фронт обрізає пробіли
  onboardedAt: string   // ISO
  updatedAt: string     // ISO
}
```

### Ендпоінти

| Метод | Шлях | Тіло | Відповідь |
|---|---|---|---|
| GET | `/api/profile` | — | `UserProfile` або **404**, якщо онбординг не пройдено |
| PUT | `/api/profile` | `{ interfaceLanguage, level, goal }` | `UserProfile` (створює або перезаписує, ставить `onboardedAt`) |
| PATCH | `/api/profile` | частина тих самих полів | `UserProfile` або 404 |

Акаунт береться з сесії, тому `accountId` у шляху не потрібен. Відповідь 404 на GET для фронта означає «показати онбординг», тому вона не має бути помилкою в логах як збій.

---

## 5. P1 — Розпізнавання голосової відповіді

### Що є у фронтенді

Під час паузи користувач натискає мікрофон і каже слово. Запис іде через `MediaRecorder`:

- до 8 с;
- автоматично зупиняється після 1.5 с тиші;
- формат `audio/webm;codecs=opus` (Android Chrome) або `audio/mp4`.

Аудіо лишається в пам'яті й одразу передається в `evaluateAnswer(lessonId, gapId, audio)`. Зараз ця функція повертає випадковий результат.

Відповідь текстом («Ввести текстом») перевіряється локально функцією `matchAnswer()` з `src/lib/matchAnswer.ts`:

- нормалізація: нижній регістр, без наголосів і пунктуації;
- пошук відповіді всередині фрази;
- до 1–2 дрібних помилок для слів від 4 літер.

### Що потрібно

Розпізнавання мовлення (STT) іспанською, **es-ES**. Варіантів контракту два, і вибір за бекендом:

**A. Тільки транскрипція (рекомендовано)**

```
POST /api/speech/transcribe
multipart/form-data: audio (Blob)
→ 200 { "transcript": "un café con leche", "confidence": 0.91 }
```

Фронт сам порівнює транскрипт з очікуваними відповідями тим самим `matchAnswer()`, що й для тексту. Плюси:

- бекенду не потрібні дані уроків, які лежать на фронті;
- логіка перевірки одна для голосу й тексту.

Правильні відповіді все одно є у фронтовому бандлі, тож перевірка на сервері нічого не приховає.

**B. Транскрипція + перевірка на сервері** (так записано в коментарі в `evaluateAnswer.ts`)

```
POST /api/speech/evaluate
multipart/form-data: lessonId, gapId, audio
→ 200 { "verdict": "correct" | "wrong" | "unclear", "transcript": "...", "confidence": 0.91 }
```

Для цього варіанта бекенду потрібні відповіді для кожної паузи. Їх можна копіювати з `src/mocks/lessons/*.json` під час деплою або приймати в запиті (`expected: string[]`). Тоді на сервері треба повторити `matchAnswer()`.

### Вимоги

| Вимога | Деталі |
|---|---|
| Затримка | бажано < 1.5 с. Користувач чекає на паузі, фронт показує «Перевіряємо…» |
| Тиша або шум | порожній транскрипт або `confidence < 0.5` фронт трактує як `unclear` («не розчули, повторіть»). Спроба тоді не зараховується |
| Приватність | **аудіо не зберігати й не логувати**. Онбординг обіцяє користувачам: «Audio is not stored» |
| Гості | ендпоінт має працювати і без акаунта, бо вхід необов'язковий. Потрібен rate limit за IP або anonymous id |
| Розмір | до ~8 с opus, зазвичай < 100 КБ. Ліміт тіла 1 МБ з запасом |

---

## 6. P1 — Прогрес і продовження уроку

### 6.1 Як це працює зараз (18.11.2026)

Прогрес є лише в браузері: `useUserStore` (`src/store/useUserStore.ts`), zustand `persist`, ключ localStorage `movaquest-user-v1`, версія схеми 10. Бекенд нічого про прогрес не знає, мережевих викликів немає.

**Що зберігається:**

```ts
// Пройдені уроки: lessonId → найкращий результат
completedLessons: Record<string, {
  outcome: 'perfect' | 'partial' | 'missed'
  correct: number       // скільки пауз відповіли правильно
  total: number         // скільки пауз в уроці (lesson.gaps.length)
  completedAt: string   // ISO, час проходження, яке дало цей результат
}>

// Вивчені слова: lessonId → id пауз (Gap.id), на які хоч раз відповіли правильно
learnedWords: Record<string, string[]>

// Незавершені уроки: lessonId → знімок автомата уроку
activeLessons: Record<string, MachineState>

// Прогрес акаунтів, з яких вийшли на цьому пристрої: accountId → { completedLessons, learnedWords }
progressByAccount: Record<string, AccountProgress>
```

`MachineState` (`src/features/player/gapMachine.ts`): `status`, `gapIndex`, `attempts`, `hintShown`, `lastVerdict`, `heard`, `results: GapResult[]`, `outcome`, `endAt`, `practiceGapId`, `practiceResult`. Кожен `GapResult` має `gapId`, `resolution`, `attempts` (невдалі спроби) і `heard` (що користувач сказав чи набрав). Резолюції:

| Резолюція | Значення |
|---|---|
| `correct` | відповів правильно |
| `revealed` | вичерпав спроби, відповідь показано |
| `skipped` | натиснув «Пропустити» |
| `passed` | перемотав відео за паузу |

**Хто й коли пише** (усе з `usePlayerStore.dispatch` і `start`, `src/store/usePlayerStore.ts`):

| Подія | Виклик | Правило |
|---|---|---|
| Урок стартував | `setActiveLesson(id, machine)` | знімок одразу після `start()` |
| Будь-яка зміна стану автомата | `setActiveLesson(id, next)` | після кожного переходу, який змінив стан: спроби, підказка, вердикт, нова пауза. Це десятки записів за урок |
| Пауза стала `correct` (уперше або через «Спробувати ще раз») | `recordWordLearned(id, gapId)` | лише для акаунта; повторно те саме слово не додається; слово ніколи не «розвчається» |
| Урок завершено (`status: 'ended'`) | `recordLessonResult(id, outcome, correct, total)` і `setActiveLesson(id, null)` | лише для акаунта; новий результат записується, якщо `correct` не менший за збережений (рівний перезаписує, тож `completedAt` оновлюється) |
| Урок не знайдено | `setActiveLesson(id, null)` | `LessonPlayerPage` |
| «Скинути прогрес» у профілі | `resetProgress()` | очищає `completedLessons`, `learnedWords` і `activeLessons` |

**Хто читає:**

- `usePlayerStore.load` бере `activeLessons[lesson.id]` і віддає в `restoreState()`. Та відкидає знімок, якщо урок змінився (зник `gapId`, `gapIndex` за межами) або вже завершений, і рахує секунду старту.
- `LessonsPage`: позначки пройдених уроків у «Серіях» (`completedLessons`).
- `ProfilePage`: кількість пройдених уроків, вивчених слів і точність (сума `correct` / сума `total` по `completedLessons`).
- `LessonResultPage`: результат для прямого посилання `/lesson/:id/result`.

**Акаунт і гість.** `setAccount` при зміні акаунта кладе поточні `completedLessons` і `learnedWords` у `progressByAccount[prevId]` і відновлює звідти прогрес наступного акаунта (у гостя порожньо). `recordLessonResult` і `recordWordLearned` для гостя нічого не роблять.

**Що з цього випливає (і що треба врахувати під час перенесення):**

1. Прогрес не переходить між пристроями й губиться разом з localStorage (очищення сайту, інший браузер, приватний режим).
2. `activeLessons` не прив'язані до акаунта: вони спільні для гостя й усіх акаунтів на пристрої й не потрапляють у `progressByAccount`. Після виходу інший користувач продовжить чужий незавершений урок.
3. `resetProgress` чистить лише браузер. З бекендом скидання має йти на сервер, інакше синхронізація поверне дані.
4. `progressByAccount` — це, по суті, локальний кеш серверних даних. Коли сервер стане джерелом правди, він лишається лише як офлайн-кеш.
5. Знімок `MachineState` містить `heard` (тексти відповідей користувача). Аналітика їх не відправляє; на бекенд вони потраплять лише як частина знімка незавершеного уроку (див. §6.3, приватність).
6. Деякі `Gap.id` мають не-ASCII символи (`día`), тож `gapId` не варто передавати в шляху URL.

### 6.2 Що зберігати на бекенді

Прогрес лише для акаунта: усі ендпоінти нижче вимагають сесію і для гостя відповідають 401. Гість і далі продовжує незавершені уроки локально.

Таблиці (Postgres, `lessonId` і `gapId` — зовнішні ключі без своїх таблиць, див. §10):

| Таблиця | Поля | Ключ |
|---|---|---|
| `lesson_results` | `account_id`, `lesson_id`, `outcome`, `correct`, `total`, `completed_at`, `updated_at` | PK (`account_id`, `lesson_id`) |
| `learned_words` | `account_id`, `lesson_id`, `gap_id`, `learned_at` | PK (`account_id`, `lesson_id`, `gap_id`) |
| `active_lessons` | `account_id`, `lesson_id`, `machine` jsonb, `client_updated_at`, `updated_at` | PK (`account_id`, `lesson_id`) |
| `lesson_attempts` (необов'язково) | `id`, `account_id`, `lesson_id`, `outcome`, `correct`, `total`, `completed_at` | історія всіх проходжень для майбутньої статистики |

Усі три основні таблиці з `ON DELETE CASCADE` від `accounts` (вимога видалення акаунта з §13).

**Правила на сервері** (повторюють фронт, щоб два пристрої не затирали один одного):

- `lesson_results`: upsert, лише якщо `new.correct >= old.correct`. Інакше запис не змінюється, а відповідь повертає збережений (кращий) результат.
- `learned_words`: `INSERT ... ON CONFLICT DO NOTHING`. Видаляються лише при скиданні прогресу.
- `active_lessons`: перемагає пізніший `client_updated_at` (час з пристрою, коли знімок зроблено). Старіший запис ігнорується, відповідь 200 з тим, що лежить на сервері. Завершення уроку (`PUT /lessons/...`) у тій самій транзакції видаляє `active_lessons` для цього уроку, а знімок з `client_updated_at` раніше за `completed_at` цього уроку сервер ігнорує (інакше запізнілий відкладений запис воскресить уже пройдений урок).
- `machine` бекенд не розбирає: зберігає як непрозорий JSON. Перевірити лише, що це об'єкт і розмір до 32 КБ (типовий знімок 1–3 КБ).

**Валідація:**

| Поле | Правило |
|---|---|
| `lessonId` | `^[a-z0-9-]{1,64}$` |
| `gapId` | непорожній рядок до 64 символів, Unicode (`día`); лише в тілі запиту, не в шляху |
| `outcome` | `perfect` \| `partial` \| `missed` |
| `correct`, `total` | цілі, `0 <= correct <= total <= 100` |
| `completedAt`, `updatedAt` | ISO 8601; час з майбутнього (з допуском 5 хв) сервер заміняє на `now()` |

### 6.3 Ендпоінти

Усе під `/api/v1` через `apiFetch` (cookie сесії, `X-CSRF-Token` на змінних запитах). Форми відповідей збігаються з типами фронту, тож у сховище їх можна класти без перетворень.

| Метод | Шлях | Тіло / відповідь |
|---|---|---|
| GET | `/me/progress` | → `Progress` (нижче) |
| PUT | `/me/progress/lessons/{lessonId}` | `{ outcome, correct, total, completedAt }` → `CompletedLesson` (збережений, тобто кращий) |
| POST | `/me/progress/words` | `{ items: [{ lessonId, gapId }] }` → 204. Ідемпотентно; масив, бо слова зручно надсилати пачкою |
| PUT | `/me/progress/active/{lessonId}` | `{ machine, updatedAt }` → `{ machine, updatedAt }` (те, що лежить на сервері) |
| DELETE | `/me/progress/active/{lessonId}` | → 204 (урок не знайдено або знімок не підійшов `restoreState`) |
| POST | `/me/progress/import` | `Progress` → `Progress`. Злиття локальних даних за правилами §6.2; повертає результат злиття |
| DELETE | `/me/progress` | → 204. «Скинути прогрес»: видаляє всі три таблиці акаунта |

```ts
// Відповідь GET /me/progress і тіло/відповідь import
interface Progress {
  completedLessons: Record<string, CompletedLesson>
  learnedWords: Record<string, string[]>
  activeLessons: Record<string, { machine: MachineState; updatedAt: string }>
}
```

`import` закриває і §11, і повтор невдалих записів: фронт просто надсилає все, що має локально, і отримує об'єднане. Через це окрема черга невідправлених запитів на фронті не потрібна.

**Приватність.** `machine.heard` і `results[].heard` містять те, що користувач сказав чи набрав. Варіанти: (а) зберігати як є, бо екран результату їх показує; (б) фронт вирізає `heard` перед відправкою, і після продовження на іншому пристрої підсумок покаже лише резолюції. Пропозиція: (а), але без логування тіл цих запитів.

**Rate limit:** `PUT /me/progress/active/*` до ~60 на хвилину на акаунт (фронт і так шле з затримкою), решта як загальні.

### 6.4 Що зробити на фронті

Компоненти й `gapMachine` не змінюються. Дії сховища лишаються синхронними (оптимістично), мережа йде фоном.

1. **`src/api/progress.ts`**: `getProgress`, `saveLessonResult`, `markWordsLearned`, `saveActiveLesson`, `clearActiveLesson`, `importProgress`, `resetProgressRemote` через `apiFetch`. Мок у `mockDb` (таблиці `lesson_results`, `learned_words`, `active_lessons`) за прапорцем `VITE_MOCK_PROGRESS=true`, як `VITE_MOCK_SOCIAL`.
2. **`useUserStore`, міграція v11:**
   - `activeLessons: Record<string, { machine: MachineState; updatedAt: string }>` (зараз без часу, а він потрібен для «пізніший перемагає»). Міграція ставить `updatedAt` = час міграції.
   - `activeLessons` стає частиною `AccountProgress`: `setAccount` ховає й відновлює їх разом з рештою прогресу; гість має свої. Це закриває пункт 2 з §6.1.
   - нова дія `setProgress(progress: Progress)` для результату синхронізації.
   - `usePlayerStore.load` читає `activeLessons[id].machine`.
3. **`src/features/account/useProgressSync.ts`** (за зразком `useReactionsSync` і `useProfileSync`, підключити в `App.tsx`):
   - **Вхід / запуск з сесією / подія `online`:** `importProgress(локальний Progress)` → `setProgress(відповідь)`. Перевіряти, що `account.id` не змінився, поки йшов запит (як у `syncReactions`). Під час першого входу так само переносяться гостьові `activeLessons`, якщо в акаунта цих уроків ще немає.
   - **Підписка на сховище** (лише з акаунтом, і не одразу після `setAccount`/`setProgress`, щоб не відсилати назад щойно отримане):
     - новий чи змінений запис у `completedLessons` → `saveLessonResult`, відповідь кладемо в сховище;
     - нові `gapId` у `learnedWords` → `markWordsLearned` пачкою (затримка ~1 с);
     - зміна `activeLessons[id]` → `saveActiveLesson` з затримкою ~2 с на кожен урок (останній знімок перемагає); видалення → `clearActiveLesson`, крім завершення, бо сервер уже прибрав знімок у `PUT /lessons`; при завершенні відкладений знімок цього уроку скасувати;
     - `visibilitychange` → `hidden`: негайно відправити відкладені знімки з `keepalive: true` (`apiFetch` передає `init` у `fetch` без змін).
   - Мережеві збої ігноруються: локальний стан лишається, а наступний `import` (запуск, вхід, `online`) дошле його.
4. **`resetProgress`** у профілі: спершу `DELETE /me/progress`, і лише після успіху чистити локально. Якщо мережі немає, показати помилку, бо інакше `import` поверне дані з сервера.
5. **`progressByAccount`** лишається як офлайн-кеш: після входу профіль одразу показує кешовані числа, а `import` їх уточнює. Прибрати, коли прогрес стабільно житиме на сервері.
6. Тести: `useUserStore` (міграція v11, `setAccount` з `activeLessons`), `src/api/progress.test.ts` (форми запитів, злиття в моку), `useProgressSync` (не надсилає щойно отримане, перевірка `account.id`).

---

## 7. P1 — Лайки й збережені уроки (свої)

### Що є у фронтенді

Праворуч на відео є колонка, як у TikTok: лайк, коментарі, збереження, поширення. Що лайкнув і зберіг сам користувач, лежить у `likedLessons` і `savedLessons` (масиви `lessonId`) у localStorage. Функції `setLessonLiked()` і `setLessonSaved()` у `src/api/social.ts` уже викликаються, але порожні: це готові точки підключення. Збережені уроки отримують бейдж «Збережено» в розділі «Серії».

### Ендпоінти

| Метод | Шлях | Призначення |
|---|---|---|
| GET | `/api/me/reactions` | `{ liked: string[], saved: string[] }` |
| PUT / DELETE | `/api/lessons/:lessonId/like` | поставити або зняти лайк (ідемпотентно) |
| PUT / DELETE | `/api/lessons/:lessonId/save` | зберегти або прибрати |

---

## 8. P2 — Лічильники й коментарі

### Що є у фронтенді

```ts
// src/types/social.ts
interface LessonStats {    // без урахування дій поточного користувача: свої лайк/збереження фронт додає сам
  likes: number
  comments: number
  saves: number
  shares: number
}

interface LessonComment {
  id: string
  author: string           // ім'я, яке показуємо
  text: string             // до 150 символів (COMMENT_MAX_LENGTH)
  createdAt: string        // ISO
  likes: number
  own?: boolean            // коментар поточного користувача
}
```

- Коментарі показуються в нижній шторці, нові зверху. Поле вводу обмежене 150 символами.
- Поширення відкриває системне меню «Поділитися» або копіює посилання. Після вдалого поширення фронт викликає `recordShare()`.
- Великі числа фронт форматує сам (12 480 → «12.5K»).

### Ендпоінти

| Метод | Шлях | Відповідь |
|---|---|---|
| GET | `/api/lessons/:lessonId/stats` | `LessonStats` |
| GET | `/api/lessons/:lessonId/comments?cursor=` | `{ items: LessonComment[], nextCursor }` |
| POST | `/api/lessons/:lessonId/comments` | `{ text }` → `LessonComment` |
| DELETE | `/api/comments/:id` | свій коментар |
| POST | `/api/comments/:id/report` | скарга (за бажанням) |
| POST | `/api/lessons/:lessonId/share` | `{ method: 'native' \| 'copy' }` → 204 |

Відкриті питання:

- **Хто може коментувати.** Пропозиція: лише користувачі з акаунтом. Тоді фронт для гостя покаже «Увійдіть, щоб коментувати» замість поля вводу. Зараз писати може будь-хто.
- **Поширення від гостей.** Мають рахуватися, бо вхід необов'язковий.
- **Модерація.** Потрібен хоча б фільтр і rate limit на POST коментарів.

---

## 9. Аналітика (бекенд не потрібен)

PostHog підключається напряму з фронту (`VITE_POSTHOG_KEY`). Події: `lesson_started`, `gap_reached`, `answer_checked`, `hint_shown`, `gap_resolved`, `mic_denied`, `lesson_completed`, `lesson_liked`, `lesson_saved`, `comments_opened`, `comment_posted`, `lesson_shared`. Вони містять лише ідентифікатори й результати: жодних текстів відповідей і аудіо.

Від бекенду тут потрібно лише одне. Якщо треба об'єднати анонімного користувача з акаунтом, фронт після входу викличе `posthog.identify(account.id)` з `alias` анонімного `userId`. Це зміна на фронті, але `account.id` має бути стабільним.

---

## 10. Що лишається на фронтенді

- **Відео й обкладинки**: `public/clips/<lessonId>/`, деплой разом із фронтом.
- **Каталог** `src/mocks/lessons/index.json` і **уроки** `src/mocks/lessons/<id>.json`: субтитри трьома мовами, паузи, відповіді, переклади, дата додавання `addedAt`, від якої залежить порядок стрічки й «Головна».
- **Логіка уроку**: автомат пауз, підказки, перемотка, перевірка набраної відповіді.
- **Налаштування пристрою**: тема, мови субтитрів, швидкість відео, дозвіл мікрофона, закрита підказка «Увійдіть».

Наслідок для бекенду: усюди, де є `lessonId` (прогрес, лайки, коментарі, статистика), бекенд приймає його як зовнішній ключ без своєї таблиці уроків. Урок, якого вже немає в каталозі, фронт просто не покаже.

---

## 11. Перенесення локальних даних після входу

Гість прогресу не має (результати й вивчені слова рахуються лише з акаунтом), але може почати уроки, лайкнути й зберегти щось ще до реєстрації. Усе це в localStorage. Після входу фронт надсилає ці дані на сервер:

- **незавершені уроки й прогрес:** `POST /api/v1/me/progress/import` (§6.3). Пройдені уроки: лишається результат з більшим `correct`; вивчені слова: об'єднання; незавершені: пізніший `updatedAt`;
- **лайки й збереження:** вже працює через `useReactionsSync` (`GET /me/reactions` + `PUT` для локальних), результат — об'єднання.

---

## 12. Модель даних (пропозиція)

| Таблиця | Поля |
|---|---|
| `accounts` | `id`, `email` (unique, lowercase), `name`, `password_hash` (null для Google), `google_sub` (unique, null), `created_at` |
| `profiles` | `account_id` PK/FK, `interface_lang`, `level`, `goal`, `onboarded_at`, `updated_at` |
| `lesson_results` | `account_id`, `lesson_id`, `outcome`, `correct`, `total`, `completed_at`, `updated_at`; PK (`account_id`, `lesson_id`), найкращий результат (§6.2) |
| `learned_words` | `account_id`, `lesson_id`, `gap_id`, `learned_at`; PK (`account_id`, `lesson_id`, `gap_id`) |
| `active_lessons` | `account_id`, `lesson_id`, `machine` jsonb, `client_updated_at`, `updated_at`; PK (`account_id`, `lesson_id`) |
| `lesson_reactions` | `account_id`, `lesson_id`, `kind` (`like` \| `save`), `created_at`; PK (`account_id`, `lesson_id`, `kind`) |
| `comments` | `id`, `lesson_id`, `account_id`, `text`, `created_at`, `deleted_at`, `likes_count` |
| `lesson_shares` | `lesson_id`, `method`, `created_at`, `account_id` (null для гостя) |
| `lesson_stats` | агрегати або view над попередніми таблицями |

---

## 13. Загальні вимоги

| Вимога | Деталі |
|---|---|
| HTTPS і CORS | origin-и: домен Vercel, preview-домени Vercel, `http://localhost:5173`. Для тестів з телефона ще `adb reverse` на localhost (див. README) |
| Формат | JSON, дати в ISO 8601 UTC, помилки як у §3 |
| Мови | тексти помилок фронт перекладає сам за `code` (en, uk, es). `message` потрібен лише для логів |
| Rate limit | `sign-in`, `sign-up`, `speech`, `comments` |
| Приватність | аудіо не зберігається; видалення акаунта (`DELETE /api/account`) прибирає профіль, прогрес, реакції й коментарі |
| Змінна для фронту | фронт чекатиме `VITE_API_URL` |

---

## 14. Що зміниться на фронті після готовності бекенду

Тільки тіла функцій у `src/api/`; компоненти й типи лишаються.

| Файл | Зміна |
|---|---|
| `src/api/auth.ts` | `signUp`, `signIn`, `signOut` → API; додати `getMe()` при запуску |
| `src/api/googleAuth.ts` | передавати ID token або code на `/api/auth/google` замість читання userinfo в браузері |
| `src/api/profile.ts` | `getProfile`, `saveProfile`, `updateProfile` → API |
| `src/api/evaluateAnswer.ts` | `evaluateAnswer` → `/api/speech/transcribe` (або `/evaluate`) |
| `src/api/social.ts` | статистика, коментарі, лайки, збереження, поширення → API |
| `src/api/progress.ts` (новий), `src/store/useUserStore.ts`, `src/features/account/useProgressSync.ts` (новий) | прогрес з API після входу, фонове надсилання змін, міграція v11 (§6.4) |
| `src/api/mockDb.ts` | видалити, коли жоден мок ним не користується |

## 15. Питання до бекенду

1. Сесія через cookie чи bearer-токен?
2. Google: ID token чи authorization code? Що робити, якщо email з Google уже зареєстрований з паролем?
3. Розпізнавання: тільки транскрипція (варіант A) чи з перевіркою на сервері (B)? Який STT-провайдер і яка очікувана затримка?
4. Чи потрібна історія всіх проходжень уроку (`lesson_attempts`), чи вистачить найкращого результату? Зберігаємо `heard` у знімку незавершеного уроку чи фронт його вирізає (§6.3)?
5. Коментарі тільки для акаунтів? Чи потрібна модерація з першого дня?
6. Чи робимо імпорт гостьових даних (§11) у першій версії?
7. Чи потрібні скидання пароля й підтвердження email? Зараз на фронті їх немає, але для email-входу вони знадобляться.
