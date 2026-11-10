import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function TabBar() {
  const { t } = useTranslation()
  return (
    <nav className="tabbar" aria-label={t('app.name')}>
      <NavLink to="/lessons" className="tabbar__item">
        {t('tabs.lessons')}
      </NavLink>
      <NavLink to="/profile" className="tabbar__item">
        {t('tabs.profile')}
      </NavLink>
    </nav>
  )
}
