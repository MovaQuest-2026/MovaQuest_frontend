import { useTranslation } from 'react-i18next'

export function ProfilePage() {
  const { t } = useTranslation()
  return (
    <main className="page">
      <h1 className="page__title">{t('profile.title')}</h1>
    </main>
  )
}
