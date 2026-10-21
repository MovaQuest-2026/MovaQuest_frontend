import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'

// Старт гри одразу веде в перший рівень; без мови вхід спершу відкриє вибір мови.
const FIRST_LEVEL_ID = 'picnic'

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
    navigate(`/levels/${FIRST_LEVEL_ID}`)
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
        <button type="button" onClick={() => navigate(`/levels/${FIRST_LEVEL_ID}`)}>
          {t('start.start')}
        </button>
      )}
      <button type="button" onClick={() => navigate('/credits')}>
        {t('start.credits')}
      </button>
    </div>
  )
}
