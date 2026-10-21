import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { getLevels, type LevelInfo } from '../api/getLevels'
import { useGameStore } from '../store/useGameStore'

export function LevelSelectScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const currentCity = useGameStore((state) => state.currentCity)
  const finished = useGameStore((state) => state.flags.game_finished === true)
  const [levels, setLevels] = useState<LevelInfo[]>([])

  useEffect(() => {
    getLevels().then(setLevels)
  }, [])

  if (!nativeLanguage) return <Navigate to="/language?next=/levels" replace />

  return (
    <div className="screen levels-screen">
      <h1>{t('levels.title')}</h1>
      <ul className="level-list">
        {levels.map((level) => {
          const isCurrent = currentCity === level.cityId
          const action = !isCurrent
            ? 'start'
            : finished
              ? 'replay'
              : 'continue'
          return (
            <li key={level.id} className={level.main ? 'level-card level-card-main' : 'level-card'}>
              {level.main && <span className="level-badge">{t('levels.main')}</span>}
              <h2>{level.title[nativeLanguage]}</h2>
              <p>{level.description[nativeLanguage]}</p>
              <p className="level-meta">
                {t('levels.minutes', { minutes: level.minutes })}
                {isCurrent && finished && ` · ${t('levels.completed')}`}
              </p>
              <button type="button" onClick={() => navigate(`/levels/${level.id}`)}>
                {t(`levels.${action}`)}
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={() => navigate('/play')}>
        {t('levels.back')}
      </button>
    </div>
  )
}
