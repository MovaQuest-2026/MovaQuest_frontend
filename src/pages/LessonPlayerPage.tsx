import { useTranslation } from 'react-i18next'

export function LessonPlayerPage() {
  const { t } = useTranslation()
  return (
    <main className="page">
      <h1 className="page__title">{t('player.title')}</h1>
    </main>
  )
}
