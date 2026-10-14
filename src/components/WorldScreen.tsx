import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { getCityConfig, getZone, type CityConfig } from '../api/getCityConfig'
import { useGameStore } from '../store/useGameStore'
import { PhaserGame } from '../game/PhaserGame'
import { DialogueOverlay } from './DialogueOverlay'
import { ExerciseScreen } from './ExerciseScreen'
import { InteractionHint } from './InteractionHint'

export function WorldScreen() {
  const { t } = useTranslation()
  const { cityId } = useParams<{ cityId: string }>()
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const setCurrentCity = useGameStore((state) => state.setCurrentCity)
  const currentZone = useGameStore((state) => state.currentZone)
  const setCurrentZone = useGameStore((state) => state.setCurrentZone)
  const activeExercise = useGameStore((state) => state.activeExercise)
  const [city, setCity] = useState<CityConfig | null>(null)
  // Збережена позиція означає, що гравець уже бачив інтро цього міста.
  const [introDismissed, setIntroDismissed] = useState(
    () => useGameStore.getState().spawn !== null,
  )

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
  }, [cityId, setCurrentCity])

  // До L2 світ один: показуємо NPC стартової зони на тестовій тайлмапі.
  useEffect(() => {
    if (city && currentZone === null) setCurrentZone(city.startZone)
  }, [city, currentZone, setCurrentZone])

  if (!city) {
    return <div className="screen world-screen" />
  }

  const lang = nativeLanguage ?? 'en'

  if (!introDismissed) {
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

  return (
    <div className="game-screen">
      <PhaserGame zone={getZone(city, city.startZone)} />
      <InteractionHint />
      <DialogueOverlay />
      {activeExercise && (
        <div className="world-overlay">
          <ExerciseScreen key={activeExercise} dialogueId={activeExercise} />
        </div>
      )}
    </div>
  )
}
