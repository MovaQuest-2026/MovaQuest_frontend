import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export function StartScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="screen start-screen">
      <div className="logo-placeholder" aria-hidden="true">
        {t('start.title')}
      </div>
      <button type="button" onClick={() => navigate('/language')}>
        {t('start.start')}
      </button>
    </div>
  )
}
