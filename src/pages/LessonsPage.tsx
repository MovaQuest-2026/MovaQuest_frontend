import { useTranslation } from 'react-i18next'

export function LessonsPage() {
  const { t } = useTranslation()
  return (
    <main className="page">
      <h1 className="page__title">{t('lessons.title')}</h1>
    </main>
  )
}
