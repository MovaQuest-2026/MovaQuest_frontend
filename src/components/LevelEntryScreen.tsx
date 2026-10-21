import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getLevel } from '../api/getLevels'
import { useGameStore } from '../store/useGameStore'

// Вхід у рівень за адресою /levels/:levelId: продовжує збережений прогрес рівня або починає його заново.
export function LevelEntryScreen() {
  const { i18n } = useTranslation()
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)

  useEffect(() => {
    if (!levelId || !nativeLanguage) return
    let cancelled = false
    getLevel(levelId).then((level) => {
      if (cancelled) return
      if (!level) {
        navigate('/levels', { replace: true })
        return
      }
      const { currentCity, flags, startLevel } = useGameStore.getState()
      const canContinue = currentCity === level.cityId && flags.game_finished !== true
      if (!canContinue) startLevel(level.cityId)
      i18n.changeLanguage(nativeLanguage)
      navigate(`/world/${level.cityId}`, { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [levelId, nativeLanguage, navigate, i18n])

  if (!nativeLanguage) {
    return <Navigate to={`/language?next=/levels/${levelId ?? ''}`} replace />
  }
  return <div className="screen" />
}
