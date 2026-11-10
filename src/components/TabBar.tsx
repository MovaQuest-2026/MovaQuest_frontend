import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const icons: Record<'home' | 'lessons' | 'profile', ReactNode> = {
  home: (
    <path d="M12 3.2 3 10.4V20a1 1 0 0 0 1 1h5.5v-6.5h5V21H20a1 1 0 0 0 1-1v-9.6L12 3.2Z" fill="currentColor" />
  ),
  lessons: (
    <>
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15.6 8.4-2.2 5-5 2.2 2.2-5 5-2.2Z" fill="currentColor" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4.5 20.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
}

// Нижнє меню в стилі стрічки коротких відео: іконка над підписом.
export function TabBar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const inLesson = pathname.startsWith('/lesson/')

  const tab = (key: keyof typeof icons, to: string, forceActive = false) => (
    <NavLink
      to={to}
      className={({ isActive }) => `tabbar__item${isActive || forceActive ? ' active' : ''}`}
    >
      <svg className="tabbar__icon" viewBox="0 0 24 24" aria-hidden="true">
        {icons[key]}
      </svg>
      <span>{t(`tabs.${key}`)}</span>
    </NavLink>
  )

  return (
    <nav className="tabbar" aria-label={t('tabs.label')}>
      {/* В уроці «Головна» — це поточне відео: дотик не перезапускає його. */}
      {tab('home', inLesson ? pathname : '/home', inLesson)}
      {tab('lessons', '/lessons')}
      {tab('profile', '/profile')}
    </nav>
  )
}
