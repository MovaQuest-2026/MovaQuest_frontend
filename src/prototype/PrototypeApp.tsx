import { Link, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import {
  AuthPage,
  HomePage,
  NotificationsPage,
  OnboardingLanguagePage,
  OnboardingLevelPage,
  PricingPage,
  ProfilePage,
  ProtoLandingPage,
  SettingsPage,
  SitemapPage,
} from './CommonPages'
import {
  CardsGamePage,
  DictionaryPage,
  GamesPage,
  LibraryHomePage,
  PracticePage,
  RulePage,
  RulesPage,
  TopicPage,
  TopicsPage,
} from './LibraryPages'
import { TalkDialoguePage, TalkHistoryPage, TalkListPage, TalkReviewPage } from './TalkPages'
import { Logo } from './ProtoUi'
import { PROTO_BASE } from './data'
import { MAX_HEARTS, usePrototypeStore } from './usePrototypeStore'
import './prototype.css'

const navItems = [
  { to: 'home', label: 'Головна', icon: '🏠' },
  { to: 'library', label: 'Бібліотека', icon: '📚' },
  { to: 'talk', label: 'Розмова', icon: '🎤' },
  { to: 'games', label: 'Ігри', icon: '🎮' },
  { to: 'profile', label: 'Профіль', icon: '👤' },
]

function PrototypeLayout() {
  const hearts = usePrototypeStore((state) => state.hearts)
  const level = usePrototypeStore((state) => state.level)

  return (
    <div className="proto">
      <header className="proto-header">
        <div className="proto-header-inner">
          <Link to={`${PROTO_BASE}/home`} className="proto-logo" aria-label="MovaQuest — головна">
            <Logo />
          </Link>
          <nav className="proto-nav" aria-label="Розділи">
            {navItems.map((item) => (
              <NavLink key={item.to} to={`${PROTO_BASE}/${item.to}`} className="proto-nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="proto-stats">
            <span className="proto-stat" title="Стрік — заглушка">
              🔥 0
            </span>
            <span className="proto-stat" title="Рівень">
              {level}
            </span>
            <span className="proto-stat proto-stat-hearts" title={`Сердечка: ${hearts} з ${MAX_HEARTS}`}>
              ❤ {hearts}
            </span>
          </div>
          <Link to={PROTO_BASE} className="proto-map-link" title="Карта всіх екранів">
            🗺<span className="proto-map-label"> Карта екранів</span>
          </Link>
        </div>
      </header>
      <main className="proto-main">
        <Outlet />
      </main>
      <nav className="proto-tabbar" aria-label="Розділи">
        {navItems.map((item) => (
          <NavLink key={item.to} to={`${PROTO_BASE}/${item.to}`} className="proto-tabbar-link">
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function PrototypeApp() {
  return (
    <Routes>
      <Route element={<PrototypeLayout />}>
        <Route index element={<SitemapPage />} />
        <Route path="landing" element={<ProtoLandingPage />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="onboarding/language" element={<OnboardingLanguagePage />} />
        <Route path="onboarding/level" element={<OnboardingLevelPage />} />
        <Route path="home" element={<HomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="talk" element={<TalkListPage />} />
        <Route path="talk/history" element={<TalkHistoryPage />} />
        <Route path="talk/history/:entryId" element={<TalkReviewPage />} />
        <Route path="talk/:scenarioId" element={<TalkDialoguePage />} />
        <Route path="library" element={<LibraryHomePage />} />
        <Route path="library/topics" element={<TopicsPage />} />
        <Route path="library/topics/:topicId" element={<TopicPage />} />
        <Route path="library/rules" element={<RulesPage />} />
        <Route path="library/rules/:ruleId" element={<RulePage />} />
        <Route path="library/dictionary" element={<DictionaryPage />} />
        <Route path="library/practice/:kind/:itemId" element={<PracticePage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/cards" element={<CardsGamePage />} />
        <Route path="*" element={<Navigate to={PROTO_BASE} replace />} />
      </Route>
    </Routes>
  )
}
