# Бекенд: поточний стан і план (автентифікація + обробка звуку)

Стан на 17.11.2026. Репозиторій `MovaQuest-2026/backend` (локальна копія в `docs/backend`), коміт `ee5ee40`. Повний перелік того, що фронт колись захоче від бекенду, лежить у [backend-requirements.md](backend-requirements.md). Цей документ про те, що робити **зараз**, коли часу мало: автентифікація й розпізнавання голосу.

**Прийняті рішення (17.11.2026):**

- **Домен фронту:** `https://mova-quest-frontend.vercel.app`.
- **`username`:** генерує бекенд з email.
- **Пароль:** вимоги послаблюємо змінними на Render.
- **Сесії:** подовжуємо.
- **Змінні Render:** `FRONTEND_URL`, `OAUTH_REDIRECT_BASE_URL` і ключі Google міняє бекенд.
- **Render:** лишається безкоштовний, фронт заздалегідь «будить» сервер запитами (див. 2.4).
- **Розпізнавання:** Deepgram nova-3 з підказкою очікуваної відповіді, щоб краще розпізнавались окремі слова (див. 3.3).

Як перевіряли: бекенд піднято локально з тими самими налаштуваннями, що й на Render (Postgres, сесії й rate limit у базі, без Redis). Через curl пройдено реєстрацію, вхід, `/me`, вихід і старт Google-входу. Код не змінювався.

**Звірка з задеплоєним бекендом `https://backend-hb2j.onrender.com` (17.11.2026, вечір):**

| Пункт | Стан на Render | Що робити |
|---|---|---|
| Ендпоінти автентифікації (§1) | збігаються з таблицею нижче | — |
| Google: `OAUTH_GOOGLE_CLIENT_ID` | заданий | — |
| Google: `OAUTH_REDIRECT_BASE_URL` | **ще Render**: `redirect_uri=https://backend-hb2j.onrender.com/api/v1/auth/oauth/callback/google`, помилки йдуть на `https://backend-hb2j.onrender.com?error=…` | **бекенд:** `https://mova-quest-frontend.vercel.app`; у Google Cloud додати redirect URI `https://mova-quest-frontend.vercel.app/api/v1/auth/oauth/callback/google`. Поки це не зроблено, Google-вхід не працює: cookie зі `state` ставиться на домені Vercel, а Google повертає на Render (`invalid_state`) |
| `username` у `POST /users/` | досі обов'язковий | фронт генерує його з email (`olena_4821`), при 409 пробує інший |
| Відповідь 422 | без переліку полів (`"Invalid request…"` + `support_id`) | фронт перевіряє ім'я (2–30), email (≤ 50) і довжину пароля сам; решту показує як «пароль має містити великі й малі літери, цифру і символ» |
| Політика пароля | не перевірено (для цього треба створити акаунт на проді) | бекенд: підтвердити, що `PASSWORD_REQUIRE_SPECIAL/UPPERCASE=false` |
| Cross-site вхід | `403 Cross-site login requests are not allowed` | фронт ходить через проксі (F1 зроблено) |
| `/api/v1/health` | не існує, є лише `/health` поза `/api/v1` | фронт «будить» сервер запитом `GET /api/v1/users/me` (він і так потрібен для перевірки сесії) |

**Фронт (зроблено):** F1 (проксі в `vercel.json` і `vite.config.ts`), F2–F4, F5 (`/auth/callback`, помилка з `/?error=` веде на `/auth`), F6, F8.

---

## 1. Що вже є

**Стек:** FastAPI + шаблон [FastAPI Boilerplate](https://github.com/benavlabs/FastAPI-boilerplate) (Benav Labs). Автентифікацію дає бібліотека `crudauth`. База — синхронний SQLAlchemy з `psycopg2`, Postgres на Render. Міграцій Alembic ще немає: таблиці створює `python -m scripts.create_tables` у Pre-Deploy Command.

**Що працює з коробки** (усе під `/api/v1`):

| Можливість | Ендпоінт | Як поводиться |
|---|---|---|
| Реєстрація | `POST /users/` JSON `{name, username, email, password}` | 201 з однаковим текстом, навіть якщо email уже зайнятий (захист від перебору адрес). **Не входить** в акаунт |
| Вхід | `POST /auth/login` form `username=<email або username>`, `password`, `remember_me` | 200 `{id, username, csrf_token}` + cookie `session_id` (HttpOnly) і `csrf_token` (читається з JS) |
| Хто я | `GET /users/me` | `{id, name, username, email, email_verified, oauth_provider, …}`. `GET /auth/me` повертає те саме без `name` |
| Вихід | `POST /auth/logout` | потребує заголовок `X-CSRF-Token` |
| Google | `GET /auth/oauth/google?redirect_to=/шлях` → Google → `GET /auth/oauth/callback/google` | redirect-flow з PKCE. Після входу ставить cookie сесії й робить redirect на `redirect_to`. Приймає **лише відносний шлях на тому ж домені** |
| Скидання пароля, підтвердження email | `/auth/password/*`, `/auth/email/*` | є, але листи зараз пишуться в консоль (`EMAIL_BACKEND=console`) |
| Захист | lockout після 5 невдалих входів, rate limit, CSRF для змінних запитів у сесії, перевірка `Sec-Fetch-Site` | працює |

Також у шаблоні є tiers, ролі, API-ключі й адмінка. Для MVP вони не потрібні, їх можна не чіпати.

**Обробки звуку немає зовсім:** ні ендпоінта, ні залежностей.

## 2. Що заважає підключити фронт (знайдено під час перевірки)

### 2.1 Фронт на Vercel не може ходити на Render напряму — головне

- Вхід з іншого сайту відхиляється: `403 Cross-site login requests are not allowed`. Браузер позначає запит з `*.vercel.app` на `*.onrender.com` як `Sec-Fetch-Site: cross-site`.
- Cookie сесії мають `SameSite=lax`, тож браузер не надсилатиме їх у `fetch` з Vercel на Render, навіть якщо зняти перевірку.
- Google redirect-flow повертає тільки на відносний шлях того самого домену.

**Рішення без змін у коді бекенду: проксі через Vercel.** У `vercel.json` фронту додаємо rewrite `/api/:path*` → `https://<render-service>.onrender.com/api/:path*` перед правилом SPA. Для браузера API тоді живе на тому ж домені, що й застосунок:

- cookie стають своїми (first-party), `SameSite=lax` працює;
- перевірка cross-site проходить;
- CORS не потрібен;
- Google повертає на `https://<vercel-домен>/api/v1/auth/oauth/callback/google`, а потім на будь-яку сторінку фронту через `redirect_to`.

Локально те саме робить `server.proxy` у `vite.config.ts` (`/api` → `http://localhost:8000`).

Альтернатива: ставити cookie з `SameSite=None` і знімати перевірку cross-site. Вона гірша: треба міняти `crudauth`, а Safari й режими блокування сторонніх cookie все одно ламатимуть вхід.

### 2.2 Реєстрація не збігається з формою на фронті

| Бекенд зараз | Фронт зараз | Що робимо |
|---|---|---|
| обов'язковий `username` (малі латинські літери й цифри, унікальний) | не питає | **бекенд:** зробити `username` необов'язковим і генерувати з email (`olena` → `olena`, `olena2`, …). Невелика зміна в `UserCreate` і сервісі |
| пароль ≥ 8 символів, велика й мала літера, цифра, спецсимвол | ≥ 6 символів | **бекенд:** `PASSWORD_REQUIRE_SPECIAL=false`, `PASSWORD_REQUIRE_UPPERCASE=false` в env (для застосунку 18–30 років це надто жорстко). **Фронт:** мінімум 8 і підказка під полем |
| реєстрація не входить в акаунт | очікує, що одразу ввійшли | **фронт:** після 201 одразу викликає `POST /auth/login` тими самими даними |
| про зайнятий email не каже | показує «email уже зареєстровано» | **фронт:** якщо після реєстрації вхід не вдався, показуємо «Не вдалося увійти. Можливо, цей email уже зареєстровано — спробуйте увійти». Помилку `emailTaken` прибираємо |
| 422 зі списком помилок полів | коди `invalidEmail`, `weakPassword` | **фронт:** розбирає `detail[].loc` / `type` у свої коди |

### 2.3 Налаштування на Render, які треба змінити

| Змінна | Зараз (`.env.render.example`) | Треба |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:3000` | `https://mova-quest-frontend.vercel.app` (посилання в листах) |
| `OAUTH_REDIRECT_BASE_URL` | `https://<render>.onrender.com` | `https://mova-quest-frontend.vercel.app` (callback іде через проксі Vercel) |
| `OAUTH_GOOGLE_CLIENT_ID` / `_SECRET` | порожньо | OAuth client «Web application» у Google Cloud. Authorized redirect URIs: `https://mova-quest-frontend.vercel.app/api/v1/auth/oauth/callback/google` і для локальної розробки `http://localhost:5173/api/v1/auth/oauth/callback/google`. Authorized JavaScript origins не потрібні: Google-вхід іде через сервер |
| `SESSION_TIMEOUT_MINUTES` | 30 (за замовчуванням) | значно більше, напр. 43200 (30 днів): користувачі застосунку не мають вилітати через пів години. Фронт шле `remember_me=true` |
| `TRUSTED_PROXY_HOPS` | 1 | 2 (Vercel + Render), щоб rate limit бачив справжній IP |
| `PASSWORD_MIN_LENGTH` | 8 | лишити 8 |
| `PASSWORD_REQUIRE_SPECIAL`, `PASSWORD_REQUIRE_UPPERCASE` | `true` | `false` |
| `PASSWORD_REQUIRE_LOWERCASE`, `PASSWORD_REQUIRE_DIGIT` | `true` | на розсуд; фронт покаже правило з тексту помилки |
| `CORS_ORIGINS` | `http://localhost:3000` | з проксі не потрібен; можна лишити `http://localhost:5173` для локальних тестів без проксі |

### 2.4 Безкоштовний Render: як не чекати пробудження

Безкоштовний Web Service засинає після ~15 хв без запитів, а пробудження триває близько хвилини. Перша пауза у відео настає вже за 2–5 с після старту (у `picture-words` за 1.85 с). Тому «будити» сервер на самій паузі запізно. Домовленість для фронту:

1. **Під час відкриття застосунку** (лендінг, `/app`, будь-яка сторінка): один `GET /api/v1/health` без очікування відповіді. Поки людина читає лендінг або дивиться перші секунди, сервер прокидається.
2. **Поки вкладка відкрита й видима:** той самий запит кожні ~10 хв, щоб сервер не заснув посеред сесії.
3. **Якщо розпізнавання все ж відповідає повільно** (> 4 с): фронт пише «Сервер прокидається, ще кілька секунд…». Після таймауту ~60 с показує «Не вдалося перевірити — спробуйте ще раз або введіть текстом». Спроба не зараховується (як `unclear`).

Пробудження стосується лише Render. Сам Deepgram завжди «теплий».

Безкоштовний Render Postgres має обмежений строк життя. Перевірте дату в дашборді, щоб база не зникла посеред тестування.

## 3. Обробка звуку: що зробити

### 3.1 Що вже робить фронт

- Записує голос через `MediaRecorder`: до 8 с, зупиняється після 1.5 с тиші.
- Формат `audio/webm;codecs=opus` (Android Chrome) або `audio/mp4` (Safari). Зазвичай це 20–100 КБ.
- Аудіо не зберігає.
- Відповідь перевіряє функцією `matchAnswer()`: нормалізація, пошук усередині фрази, дрібні помилки для слів від 4 літер. Порожній результат означає `unclear` («не розчули, повторіть»), і спроба не зараховується.

### 3.2 Контракт

Бекенд перетворює звук на текст, підказуючи провайдеру очікувану відповідь. Саму відповідь перевіряє фронт тим самим кодом, що й набраний текст. Бекенду не треба знати уроки: очікувані слова фронт передає в запиті, а вони й так лежать у фронтовому бандлі.

```
POST /api/v1/speech/transcribe
Content-Type: multipart/form-data
  audio     файл (webm/opus або mp4/aac), до 1 МБ
  hint      JSON-масив очікуваних відповідей: ["leche"] або ["por favor", "porfa"], до 10 рядків по 64 символи
  lessonId  рядок, необов'язково (лише для логів/метрик, без аудіо)
  gapId     рядок, необов'язково

200 {
  "transcript": "un café con leche",
  "confidence": 0.91,                    // 0..1
  "alternatives": ["un café con leche", "un café con lecho"]   // n-best, якщо провайдер дає
}
400 { "error": { "code": "badAudio" } }      // не той формат / порожній файл
413                                           // завеликий файл
429                                           // rate limit
502 { "error": { "code": "sttFailed" } }     // провайдер не відповів або помилка
```

- **Доступ:** без входу, бо вхід у застосунку необов'язковий. Rate limit за IP, наприклад 30 запитів на хвилину.
- **Тиша:** порожній `transcript` або `confidence < 0.5` фронт трактує як `unclear`.
- **Приватність:** аудіо не зберігати на диск і не писати в логи. В онбордингу користувачам обіцяно «Audio is not stored». У Deepgram треба вимкнути зберігання запитів (параметр `mip_opt_out=true` або налаштування проєкту — перевірити в їхній документації).
- **Час відповіді:** ціль < 1.5 с від завантаження до відповіді (без урахування пробудження Render).

### 3.3 Сервіс розпізнавання: Deepgram nova-3

**Чому Deepgram:**

- **Швидкість:** сотні мілісекунд на короткий запис.
- **Формати:** приймає webm/opus з Android Chrome і mp4 з Safari без конвертації, тож `ffmpeg` на сервері не потрібен.
- **Тиша:** повертає порожній текст і низький confidence. Тоді користувач бачить «не розчули», а не «неправильно».
- **Окремі слова:** дає підказку словами (keyterm prompting), що прямо закриває наше рішення їх розпізнавати.
- **Альтернативи:** дає кілька варіантів розпізнаного тексту.

**Запит до Deepgram** (pre-recorded, `POST https://api.deepgram.com/v1/listen`):

| Параметр | Значення |
|---|---|
| `model` | `nova-3` |
| `language` | `es` (Spanish; якщо keyterm не працює з моно-мовою — `multi`, див. нижче) |
| `keyterm` | кожен рядок з `hint` окремим параметром |
| `smart_format` | `false` (нам потрібні слова, а не форматування чисел і пунктуація) |
| `alternatives` | `3` |
| тіло | сирі байти аудіо з `Content-Type` з запиту |

Відповідь: `results.channels[0].alternatives[]` → `transcript` і `confidence`.

**Перевірити першим ділом** (півгодини на тестовому ключі). Deepgram пише, що keyterm prompting для nova-3 працює з іспанською (через multilingual-режим), але в старих обговореннях є повідомлення, що він працював лише для англійської. Тест:

1. Записати з телефона 10–15 коротких відповідей з наших уроків: «leche», «sí», «por favor», «bienvenido», «haz tu tarea».
2. Прогнати їх з `keyterm` і без, з `language=es` і з `language=multi`.
3. Записати тишу й чуже слово. Тиша має давати порожній текст, чуже слово — не наше.

Якщо keyterm з іспанською не дає ефекту, **запасний варіант: OpenAI `gpt-4o-mini-transcribe`** з `language=es` і `prompt`, у якому перелічені очікувані слова (≈ $0.003 за хвилину). Тоді на бекенді треба додати перевірку гучності перед відправкою: на тиші Whisper-подібні моделі можуть «вигадати» фразу. Контракт для фронту від цього не змінюється.

**Ризик підказки:** STT частіше «почує» саме підказане слово, тож перевірка стає поблажливішою до вимови. Для мети «освіжити мову перед поїздкою» це прийнятно. Якщо стане надто поблажливо, фронт може для деяких пауз не передавати `hint`.

### 3.4 Реалізація на бекенді (орієнтовно)

1. Новий модуль `src/modules/speech/` з `routes.py` і `service.py`, підключений у `interfaces/api/v1`.
2. `UploadFile` → перевірка типу (`audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`, `audio/wav`) і розміру → асинхронний запит до провайдера через `httpx` (уже є в залежностях) з таймаутом ~5 с → відповідь у форматі 3.2.
3. Ключ у env Render: `DEEPGRAM_API_KEY` (і `SPEECH_PROVIDER=deepgram`, щоб за потреби перемкнути на OpenAI з `OPENAI_API_KEY`).
4. Rate limit за IP: у шаблоні вже є лімітер з бекендом у Postgres.
5. Taskiq і окремий worker не потрібні: запит синхронний і короткий.
6. Тести: mock провайдера, перевірки формату й розміру, порожній транскрипт.

## 4. Що зробити на фронті (після бекенду)

| # | Зміна | Файли |
|---|---|---|
| F1 | Проксі `/api/*` → Render; локально проксі Vite на `localhost:8000` | `vercel.json`, `vite.config.ts` |
| F2 | `signUp`: `POST /api/v1/users/` (без `username`, якщо бекенд його генерує), потім вхід. `signIn`: `POST /api/v1/auth/login` (form, `remember_me=true`), потім `GET /api/v1/users/me` → `Account` | `src/api/auth.ts` |
| F3 | Під час запуску `GET /api/v1/users/me`: 200 — ввійшли, 401 — гість | `src/api/auth.ts`, старт застосунку |
| F4 | `signOut`: `POST /api/v1/auth/logout` з `X-CSRF-Token` з cookie `csrf_token`. Цей заголовок додається до всіх POST/PATCH/DELETE | `src/api/auth.ts` або спільний `apiFetch` |
| F5 | Google: замість Google Identity Services у браузері — перехід на `/api/v1/auth/oauth/google?redirect_to=/auth/callback`. Нова маленька сторінка `/auth/callback` читає `/users/me` і далі робить те саме, що зараз після входу (профіль → онбординг або відео). `?error=` після невдачі показує помилку. `VITE_GOOGLE_CLIENT_ID` більше не потрібен | `src/api/googleAuth.ts`, `src/pages/AuthPage.tsx`, нова сторінка |
| F6 | Пароль мінімум 8, нові тексти помилок: 429 «Забагато спроб, спробуйте пізніше», неможливий вхід після реєстрації | `AuthPage`, i18n |
| F7 | `evaluateAnswer` → `POST /api/v1/speech/transcribe` з `hint` = відповідь + `accept`; `matchAnswer` проти `transcript` і кожної з `alternatives`; повільна відповідь і помилка за 2.4 | `src/api/evaluateAnswer.ts`, `MicButton`, i18n |
| F8 | «Будильник» Render: `GET /api/v1/health` при відкритті й кожні ~10 хв, поки вкладка видима | старт застосунку |

**Профіль з онбордингу** (мова, рівень, мета) поки лишається локальним моком. Наслідок: онбординг збережеться лише на пристрої, і на новому пристрої після входу його покажуть ще раз. Якщо лишиться час, це одна таблиця `profiles` і два ендпоінти `GET/PUT /api/v1/profile` (див. backend-requirements.md §4).

## 5. Порядок робіт

| Крок | Хто | Що | Залежить від |
|---|---|---|---|
| 1 | бекенд | env на Render (2.3), строк життя бази (2.4) | — |
| 2 | фронт | проксі `/api` (F1) і «будильник» (F8) | URL Render |
| 3 | бекенд | `username` необов'язковий, послаблена політика пароля | — |
| 4 | фронт | email-вхід і реєстрація, `/me`, вихід (F2–F4, F6) | 2, 3 |
| 5 | бекенд + Google Cloud | OAuth client, redirect URI на домен Vercel | 1, 2 |
| 6 | фронт | Google redirect-flow (F5) | 5 |
| 7 | бекенд | тест Deepgram на записах з телефона (3.3), потім `POST /api/v1/speech/transcribe` | ключ Deepgram |
| 8 | фронт | підключити розпізнавання (F7), тест на Android 360×800 | 2, 7 |

Кроки 3–4 і 7–8 можна вести паралельно: розпізнавання не залежить від автентифікації.

## 6. Що ще відкрито

1. Хто заводить акаунт і ключ Deepgram (і, на всяк випадок, OpenAI).
2. Результат тесту keyterm з іспанською (3.3): лишаємось на Deepgram чи переходимо на OpenAI.
3. Preview-деплої Vercel мають інші адреси, тож Google-вхід на них не працюватиме. Для тестів використовуємо основний домен або локальну розробку.

## Примітка про репозиторій

`docs/backend` — окремий git-репозиторій усередині репозиторію фронту. У фронті він зараз видимий як неіндексована папка. Щоб випадково не закомітити його у фронт, варто додати `docs/backend/` у `.gitignore` фронту або тримати бекенд поза цією папкою.
