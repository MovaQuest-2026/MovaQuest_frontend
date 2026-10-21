import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGameStore, type NativeLanguage } from '../store/useGameStore'

export function LanguageSelectScreen() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Прямий вхід на /levels/:id без мови повертається сюди з next.
  const next = searchParams.get('next')
  const setNativeLanguage = useGameStore((state) => state.setNativeLanguage)

  const selectLanguage = (lang: NativeLanguage) => {
    setNativeLanguage(lang)
    i18n.changeLanguage(lang)
    navigate(next && next.startsWith('/levels') ? next : '/levels/picnic')
  }

  return (
    <div className="screen language-select-screen">
      <h1>{t('languageSelect.title')}</h1>
      <button type="button" onClick={() => selectLanguage('en')}>
        {t('languageSelect.english')}
      </button>
      <button type="button" onClick={() => selectLanguage('uk')}>
        {t('languageSelect.ukrainian')}
      </button>
    </div>
  )
}
