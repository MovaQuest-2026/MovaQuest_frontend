import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { getCityConfig, type CityConfig } from '../api/getCityConfig'
import { useGameStore } from '../store/useGameStore'
import { PhaserGame } from '../game/PhaserGame'
import { DialogueOverlay } from './DialogueOverlay'
import { ExerciseScreen } from './ExerciseScreen'

export function WorldScreen() {
  const { t } = useTranslation()
  const { cityId } = useParams<{ cityId: string }>()
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const setCurrentCity = useGameStore((state) => state.setCurrentCity)
  const activeExercise = useGameStore((state) => state.activeExercise)
  const [city, setCity] = useState<CityConfig | null>(null)
  const [introDismissed, setIntroDismissed] = useState(false)

  useEffect(() => {
    if (!cityId) return

    let cancelled = false
    getCityConfig(cityId).then((config) => {
      if (!cancelled) setCity(config)
    })

    return () => {
      cancelled = true
    }
  }, [cityId])

  useEffect(() => {
    setCurrentCity(cityId ?? null)
    return () => setCurrentCity(null)
  }, [cityId, setCurrentCity])

  useEffect(() => {
    setIntroDismissed(false)
  }, [cityId])

  if (!city) {
    return <div className="screen world-screen" />
  }

  if (activeExercise) {
    return <ExerciseScreen dialogueId={activeExercise} />
  }

  if (introDismissed) {
    return (
      <div className="game-screen">
        <PhaserGame npcs={city.npcs} />
        <DialogueOverlay />
      </div>
    )
  }

  const lang = nativeLanguage ?? 'en'

  return (
    <div className="screen world-screen">
      <h1>{city.name[lang]}</h1>
      <p>{city.culturalIntro[lang]}</p>
      <button type="button" onClick={() => setIntroDismissed(true)}>
        {t('world.continue')}
      </button>
    </div>
  )
}
