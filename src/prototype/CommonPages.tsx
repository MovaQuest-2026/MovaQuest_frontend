import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PROTO_BASE, plans, seedHistory, topics } from './data'
import type { Level } from './data'
import { Eyebrow, Page, ProgressBar, StubBadge, StubBlock, StubButton, Tile } from './ProtoUi'
import { MAX_HEARTS, usePrototypeStore } from './usePrototypeStore'

type SitemapEntry = { path: string; label: string; stub?: boolean }

const sitemap: { title: string; tone: 'paper' | 'tram' | 'stop'; entries: SitemapEntry[] }[] = [
  {
    title: 'Спільне',
    tone: 'paper',
    entries: [
      { path: 'landing', label: 'Лендінг' },
      { path: 'register', label: 'Реєстрація', stub: true },
      { path: 'login', label: 'Логін', stub: true },
      { path: 'onboarding/language', label: 'Онбординг: мова інтерфейсу' },
      { path: 'onboarding/level', label: 'Онбординг: рівень' },
      { path: 'home', label: 'Головна' },
      { path: 'profile', label: 'Профіль' },
      { path: 'pricing', label: 'Тарифи та оплата', stub: true },
      { path: 'settings', label: 'Налаштування', stub: true },
      { path: 'notifications', label: 'Сповіщення та стрік', stub: true },
    ],
  },
  {
    title: 'Варіант A — Розмова з ШІ голосом',
    tone: 'tram',
    entries: [
      { path: 'talk', label: 'Вибір ситуації' },
      { path: 'talk/cafe', label: 'Голосова розмова «У кафе»' },
      { path: 'talk/history', label: 'Історія розмов' },
      { path: 'talk/history/seed-2', label: 'Розбір розмови з підказками' },
    ],
  },
  {
    title: 'Варіант B — Матеріали + мініігри',
    tone: 'stop',
    entries: [
      { path: 'library', label: 'Бібліотека' },
      { path: 'library/topics', label: 'Ситуації' },
      { path: 'library/topics/food', label: 'Ситуація «У кафе»' },
      { path: 'library/rules', label: 'Правила' },
      { path: 'library/rules/accusative', label: 'Правило «Знахідний відмінок»' },
      { path: 'library/practice/rule/accusative', label: 'Практика' },
      { path: 'library/dictionary', label: 'Словник' },
      { path: 'games', label: 'Мініігри' },
      { path: 'games/cards', label: 'Мінігра «Картки»' },
    ],
  },
]

export function SitemapPage() {
  const reset = usePrototypeStore((state) => state.reset)
  return (
    <Page title="Карта екранів" eyebrow="Прототип MovaQuest" wide>
      <p className="proto-lead">
        Клікабельний прототип без бекенду: дані захардкоджені, прогрес зберігається в браузері. Позначка <StubBadge /> — місця, які
        з'являться пізніше.
      </p>
      <div className="proto-row">
        <Link to={`${PROTO_BASE}/landing`} className="proto-btn proto-btn-primary">
          Почати як новий користувач →
        </Link>
        <button type="button" className="proto-btn proto-btn-ghost" onClick={reset}>
          Скинути прогрес
        </button>
      </div>
      <div className="proto-grid proto-grid-3">
        {sitemap.map((group) => (
          <div key={group.title} className={`proto-card proto-sitemap-card proto-tone-${group.tone}`}>
            <h2>{group.title}</h2>
            <ul className="proto-sitemap-list">
              {group.entries.map((entry) => (
                <li key={entry.path}>
                  <Link to={`${PROTO_BASE}/${entry.path}`}>{entry.label}</Link>
                  {entry.stub && <StubBadge />}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Page>
  )
}

export function ProtoLandingPage() {
  return (
    <section className="proto-page proto-page-wide proto-hero">
      <Eyebrow>Вивчай українську граючи</Eyebrow>
      <h1 className="proto-hero-title">
        Learn Ukrainian by <mark>talking</mark> and playing.
      </h1>
      <p className="proto-lead">Speak with an AI partner by voice, look up rules and words when you need them, and practise with mini-games.</p>
      <div className="proto-row proto-row-center">
        <Link to={`${PROTO_BASE}/register`} className="proto-btn proto-btn-primary">
          Почати безкоштовно
        </Link>
        <Link to={`${PROTO_BASE}/login`} className="proto-btn proto-btn-ghost">
          Вже маю акаунт
        </Link>
      </div>
      <div className="proto-grid proto-grid-3">
        <Tile emoji="📚" title="Бібліотека" description="Правила, словник і ситуації — вчи що хочеш." tone="stop" />
        <Tile emoji="🎤" title="Розмова з ШІ" description="Говори голосом і отримуй розбір помилок." tone="tram" />
        <Tile emoji="🎮" title="Мініігри" description="Закріплюй слова граючи." tone="ochre" />
      </div>
      <StubBlock title="Відгуки, FAQ, футер">Блоки лендінгу, які допишемо пізніше.</StubBlock>
    </section>
  )
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const setName = usePrototypeStore((state) => state.setName)
  const [name, setNameInput] = useState('')
  const isRegister = mode === 'register'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) setName(name.trim())
    navigate(`${PROTO_BASE}/${isRegister ? 'onboarding/language' : 'home'}`)
  }

  return (
    <Page title={isRegister ? 'Створи акаунт' : 'З поверненням'} eyebrow={isRegister ? 'Реєстрація' : 'Вхід'} back={`${PROTO_BASE}/landing`}>
      <div className="proto-card proto-window">
        <p className="proto-muted">
          <StubBadge /> Справжньої авторизації немає — будь-які дані пропускають далі.
        </p>
        <form className="proto-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              Ім'я
              <input value={name} onChange={(event) => setNameInput(event.target.value)} placeholder="Alex" />
            </label>
          )}
          <label>
            Email
            <input type="email" placeholder="you@example.com" />
          </label>
          <label>
            Пароль
            <input type="password" placeholder="••••••" />
          </label>
          <button type="submit" className="proto-btn proto-btn-primary proto-btn-block">
            {isRegister ? 'Створити акаунт' : 'Увійти'}
          </button>
        </form>
        <div className="proto-divider">або</div>
        <StubButton>Увійти через Google</StubButton>
        <Link to={`${PROTO_BASE}/${isRegister ? 'login' : 'register'}`} className="proto-link">
          {isRegister ? 'Вже маю акаунт' : 'Створити акаунт'}
        </Link>
      </div>
    </Page>
  )
}

function OnboardingSteps({ step }: { step: 1 | 2 }) {
  return (
    <div className="proto-steps">
      <span className="proto-muted">Крок {step} з 2</span>
      <ProgressBar value={step} max={2} label="Прогрес онбордингу" />
    </div>
  )
}

export function OnboardingLanguagePage() {
  const navigate = useNavigate()
  const setUiLanguage = usePrototypeStore((state) => state.setUiLanguage)

  function choose(language: 'en' | 'uk') {
    setUiLanguage(language)
    navigate(`${PROTO_BASE}/onboarding/level`)
  }

  return (
    <Page title="Якою мовою пояснювати?" eyebrow="Мова інтерфейсу" back={`${PROTO_BASE}/register`}>
      <OnboardingSteps step={1} />
      <div className="proto-grid proto-grid-2">
        <button type="button" className="proto-option" onClick={() => choose('en')}>
          <span className="proto-option-emoji">🇬🇧</span>
          <strong>English</strong>
        </button>
        <button type="button" className="proto-option" onClick={() => choose('uk')}>
          <span className="proto-option-emoji">🇺🇦</span>
          <strong>Українська</strong>
        </button>
      </div>
      <StubButton>🇵🇱 Polski та інші мови</StubButton>
    </Page>
  )
}

const levelOptions: { level: Level; title: string; description: string; emoji: string }[] = [
  { level: 'A0', title: 'З нуля', description: 'Не знаю жодного слова.', emoji: '🌱' },
  { level: 'A1', title: 'Початковий', description: 'Знаю кілька фраз, читаю кирилицю.', emoji: '🌿' },
  { level: 'A2', title: 'Базовий', description: 'Можу коротко розповісти про себе.', emoji: '🌳' },
]

export function OnboardingLevelPage() {
  const navigate = useNavigate()
  const setLevel = usePrototypeStore((state) => state.setLevel)

  function choose(level: Level) {
    setLevel(level)
    navigate(`${PROTO_BASE}/home`)
  }

  return (
    <Page title="Який у тебе рівень?" eyebrow="Рівень" back={`${PROTO_BASE}/onboarding/language`}>
      <OnboardingSteps step={2} />
      <div className="proto-grid proto-grid-3">
        {levelOptions.map((option) => (
          <button key={option.level} type="button" className="proto-option" onClick={() => choose(option.level)}>
            <span className="proto-option-emoji">{option.emoji}</span>
            <span className="proto-chip">{option.level}</span>
            <strong>{option.title}</strong>
            <span className="proto-muted">{option.description}</span>
          </button>
        ))}
      </div>
      <StubButton>Пройти тест на рівень</StubButton>
    </Page>
  )
}

export function HomePage() {
  const name = usePrototypeStore((state) => state.name)
  const level = usePrototypeStore((state) => state.level)
  const hearts = usePrototypeStore((state) => state.hearts)
  const learned = usePrototypeStore((state) => state.learned)
  const conversations = usePrototypeStore((state) => state.history.length) + seedHistory.length
  const openTopics = topics.filter((topic) => !topic.stub)
  const learnedTopics = openTopics.filter((topic) => learned.includes(`topic:${topic.id}`)).length

  return (
    <Page title={`Привіт, ${name}!`} eyebrow={`Рівень ${level}`} wide>
      <div className="proto-card proto-tone-ochre proto-goal">
        <div>
          <strong>Ціль на сьогодні</strong>
          <p className="proto-muted">1 розмова або 1 тема</p>
        </div>
        <ProgressBar value={learned.length > 0 ? 1 : 0} max={1} label="Ціль на сьогодні" />
        <StubBadge />
      </div>
      <div className="proto-grid proto-grid-2">
        <Link to={`${PROTO_BASE}/talk`} className="proto-feature proto-tone-tram">
          <span className="proto-chip proto-chip-light">Варіант A</span>
          <span className="proto-feature-emoji" aria-hidden="true">
            🎤
          </span>
          <strong className="proto-feature-title">Розмова з ШІ</strong>
          <span>
            Говори голосом · ❤ {hearts}/{MAX_HEARTS} · {conversations} в історії
          </span>
        </Link>
        <Link to={`${PROTO_BASE}/library`} className="proto-feature proto-tone-stop">
          <span className="proto-chip proto-chip-light">Варіант B</span>
          <span className="proto-feature-emoji" aria-hidden="true">
            📚
          </span>
          <strong className="proto-feature-title">Бібліотека</strong>
          <span>
            Правила, словник, ситуації · {learnedTopics}/{openTopics.length} тем
          </span>
          <ProgressBar value={learnedTopics} max={openTopics.length} label="Вивчені теми" />
        </Link>
      </div>
      <div className="proto-grid proto-grid-4">
        <Tile to={`${PROTO_BASE}/games`} emoji="🎮" title="Мініігри" description="Закріплення слів" />
        <Tile to={`${PROTO_BASE}/library/dictionary`} emoji="📖" title="Словник" description="Усі слова" />
        <Tile to={`${PROTO_BASE}/pricing`} emoji="⭐" title="Pro" description="Тарифи" tone="ochre" />
        <Tile to={`${PROTO_BASE}/profile`} emoji="👤" title="Профіль" description="Налаштування" />
      </div>
    </Page>
  )
}

export function ProfilePage() {
  const { name, level, uiLanguage, hearts, learned, history, setName, setLevel } = usePrototypeStore()

  return (
    <Page title="Профіль" eyebrow="Акаунт" back={`${PROTO_BASE}/home`}>
      <div className="proto-card proto-profile">
        <div className="proto-avatar" aria-hidden="true">
          {name.slice(0, 1).toUpperCase() || '?'}
        </div>
        <div className="proto-profile-stats">
          <div>
            <strong>{history.length + seedHistory.length}</strong>
            <span className="proto-muted">розмов</span>
          </div>
          <div>
            <strong>{learned.length}</strong>
            <span className="proto-muted">вивчено</span>
          </div>
          <div>
            <strong>{hearts}</strong>
            <span className="proto-muted">сердечок</span>
          </div>
          <div>
            <strong>0</strong>
            <span className="proto-muted">днів стріку</span>
          </div>
        </div>
      </div>
      <div className="proto-card proto-form">
        <label>
          Ім'я
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Рівень
          <select value={level} onChange={(event) => setLevel(event.target.value as Level)}>
            {levelOptions.map((option) => (
              <option key={option.level} value={option.level}>
                {option.level} — {option.title}
              </option>
            ))}
          </select>
        </label>
        <div className="proto-muted">Мова інтерфейсу: {uiLanguage === 'en' ? 'English' : 'Українська'}</div>
      </div>
      <StubBlock title="Досягнення та статистика" />
      <div className="proto-row">
        <Link to={`${PROTO_BASE}/settings`} className="proto-btn proto-btn-ghost">
          ⚙ Налаштування
        </Link>
        <Link to={`${PROTO_BASE}/notifications`} className="proto-btn proto-btn-ghost">
          🔔 Сповіщення
        </Link>
        <Link to={`${PROTO_BASE}/landing`} className="proto-link">
          Вийти
        </Link>
      </div>
    </Page>
  )
}

export function PricingPage() {
  return (
    <Page title="Обери свій план" eyebrow="Тарифи" back={`${PROTO_BASE}/home`}>
      <div className="proto-grid proto-grid-2">
        {plans.map((plan) => (
          <div key={plan.id} className={`proto-card proto-plan${plan.id === 'pro' ? ' proto-tone-ochre' : ''}`}>
            <h2>{plan.title}</h2>
            <div className="proto-price">{plan.price}</div>
            <ul className="proto-check-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            {plan.id === 'pro' ? <StubButton>Оформити Pro</StubButton> : <span className="proto-chip">Поточний план</span>}
          </div>
        ))}
      </div>
    </Page>
  )
}

export function SettingsPage() {
  return (
    <Page title="Налаштування" eyebrow="Акаунт" back={`${PROTO_BASE}/profile`}>
      <StubBlock title="Мова інтерфейсу, звук, тема, видалення акаунту">Сторінка з'явиться пізніше.</StubBlock>
    </Page>
  )
}

export function NotificationsPage() {
  return (
    <Page title="Сповіщення та стрік" eyebrow="Акаунт" back={`${PROTO_BASE}/profile`}>
      <StubBlock title="Нагадування про заняття, стрік днів, email-дайджест">Сторінка з'явиться пізніше.</StubBlock>
    </Page>
  )
}
