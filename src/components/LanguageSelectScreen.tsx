import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useGameStore, type NativeLanguage } from '../store/useGameStore'

export function LanguageSelectScreen() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setNativeLanguage = useGameStore((state) => state.setNativeLanguage)

  const selectLanguage = (lang: NativeLanguage) => {
    setNativeLanguage(lang)
    i18n.changeLanguage(lang)
    navigate('/world/vinnytsia')
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
