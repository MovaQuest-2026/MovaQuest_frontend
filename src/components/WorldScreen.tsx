import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { getCityConfig } from '../api/getCityConfig'
import { getQuestline } from '../api/getQuestline'
import { trackEndingReached } from '../api/analytics'
import { useGameStore } from '../store/useGameStore'
import { useQuestEngine } from '../store/useQuestEngine'
import { useAnalytics } from '../store/useAnalytics'
import { PhaserGame } from '../game/PhaserGame'
import { DialogueOverlay } from './DialogueOverlay'
import { ExerciseScreen } from './ExerciseScreen'
import { InteractionHint } from './InteractionHint'
import { QuestTracker } from './QuestTracker'
import { DayJournalScreen } from './DayJournalScreen'
import { VirtualJoystick } from './VirtualJoystick'

// У production import.meta.env.DEV === false, тож гілка і динамічний імпорт вирізаються з бандла.
const DebugPanel = import.meta.env.DEV ? lazy(() => import('./DebugPanel')) : null

export function WorldScreen() {
  const { t } = useTranslation()
  const { cityId } = useParams<{ cityId: string }>()
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const setCurrentCity = useGameStore((state) => state.setCurrentCity)
  const setWorldData = useGameStore((state) => state.setWorldData)
  const city = useGameStore((state) => state.cityConfig)
  const currentZone = useGameStore((state) => state.currentZone)
  const activeExercise = useGameStore((state) => state.activeExercise)
  const pendingCutscene = useGameStore((state) => state.pendingCutscene)
  const pendingEnding = useGameStore((state) => state.pendingEnding)
  const gameFinished = useGameStore((state) => state.flags.game_finished === true)
  // Збережена позиція означає, що гравець уже бачив інтро цього міста.
  const [introDismissed, setIntroDismissed] = useState(
    () => useGameStore.getState().spawn !== null,
  )

  useQuestEngine()
  useAnalytics()

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

  // Кінцівка фіксується після кат-сцени (або одразу, якщо її немає).
  useEffect(() => {
    if (!pendingEnding || pendingCutscene) return
    const { flags, finishGame } = useGameStore.getState()
    trackEndingReached(pendingEnding, Number(flags.trust ?? 0))
    finishGame(pendingEnding)
  }, [pendingEnding, pendingCutscene])

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

  // Після кінцівки гра завершена: F5 і «Продовжити» ведуть у щоденник, а не у фінальний діалог.
  if (gameFinished) {
    return <DayJournalScreen />
  }

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
      <VirtualJoystick />
      <InteractionHint />
      <DialogueOverlay />
      {activeExercise && (
        <div className="world-overlay">
          <ExerciseScreen key={activeExercise} dialogueId={activeExercise} />
        </div>
      )}
      {DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </div>
  )
}
