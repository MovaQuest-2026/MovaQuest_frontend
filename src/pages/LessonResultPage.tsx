import { useTranslation } from 'react-i18next'

export function LessonResultPage() {
  const { t } = useTranslation()
  return (
    <main className="page">
      <h1 className="page__title">{t('result.title')}</h1>
    </main>
  )
}
