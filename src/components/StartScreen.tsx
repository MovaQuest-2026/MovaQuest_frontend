import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'

export function StartScreen() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const savedCity = useGameStore((state) => state.currentCity)
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const resetProgress = useGameStore((state) => state.resetProgress)

  function handleContinue() {
    if (nativeLanguage) i18n.changeLanguage(nativeLanguage)
    navigate(`/world/${savedCity}`)
  }

  function handleRestart() {
    resetProgress()
    navigate('/language')
  }

  return (
    <div className="screen start-screen">
      <div className="logo-placeholder" aria-hidden="true">
        {t('start.title')}
      </div>
      {savedCity ? (
        <>
          <button type="button" onClick={handleContinue}>
            {t('start.continue')}
          </button>
          <button type="button" onClick={handleRestart}>
            {t('start.restart')}
          </button>
        </>
      ) : (
        <button type="button" onClick={() => navigate('/language')}>
          {t('start.start')}
        </button>
      )}
    </div>
  )
}
