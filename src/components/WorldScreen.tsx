import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { getCityConfig } from '../api/getCityConfig'
import { getQuestline } from '../api/getQuestline'
import { useGameStore } from '../store/useGameStore'
import { useQuestEngine } from '../store/useQuestEngine'
import { PhaserGame } from '../game/PhaserGame'
import { DialogueOverlay } from './DialogueOverlay'
import { ExerciseScreen } from './ExerciseScreen'
import { InteractionHint } from './InteractionHint'
import { QuestTracker } from './QuestTracker'

export function WorldScreen() {
  const { t } = useTranslation()
  const { cityId } = useParams<{ cityId: string }>()
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const setCurrentCity = useGameStore((state) => state.setCurrentCity)
  const setWorldData = useGameStore((state) => state.setWorldData)
  const city = useGameStore((state) => state.cityConfig)
  const currentZone = useGameStore((state) => state.currentZone)
  const activeExercise = useGameStore((state) => state.activeExercise)
  // Збережена позиція означає, що гравець уже бачив інтро цього міста.
  const [introDismissed, setIntroDismissed] = useState(
    () => useGameStore.getState().spawn !== null,
  )

  useQuestEngine()

  useEffect(() => {
    if (!cityId) return

    let cancelled = false
    getCityConfig(cityId).then(async (config) => {
      const questline = await getQuestline(config.questlineId)
      if (!cancelled) setWorldData(config, questline)
    })

    return () => {
      cancelled = true
    }
  }, [cityId, setWorldData])

  useEffect(() => {
    setCurrentCity(cityId ?? null)
  }, [cityId, setCurrentCity])

  const cityReady = city !== null && city.id === cityId
  const zoneKnown =
    cityReady && city.zones.some((zone) => zone.id === currentZone)

  // Нова гра або зона, якої вже немає в конфігу, — стартуємо зі стартової зони.
  useEffect(() => {
    if (cityReady && !zoneKnown) {
      useGameStore.setState({ currentZone: city.startZone, spawn: null })
    }
  }, [city, cityReady, zoneKnown])

  if (!cityReady) {
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

  if (!zoneKnown) {
    return <div className="screen world-screen" />
  }

  return (
    <div className="game-screen">
      <PhaserGame />
      <QuestTracker />
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
