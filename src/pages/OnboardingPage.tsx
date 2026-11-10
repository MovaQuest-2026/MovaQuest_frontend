import { useTranslation } from 'react-i18next'

export function OnboardingPage() {
  const { t } = useTranslation()
  return (
    <main className="page">
      <h1 className="page__title">{t('onboarding.title')}</h1>
    </main>
  )
}
