import { useGameStore } from '../store/useGameStore'
import { getCurrentStep } from '../game/quests/questEngine'

export function QuestTracker() {
  const questline = useGameStore((state) => state.questline)
  const questStep = useGameStore((state) => state.questStep)
  const gameClock = useGameStore((state) => state.gameClock)
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const lang = nativeLanguage ?? 'en'

  const step = questline ? getCurrentStep(questline, { questStep }) : null

  return (
    <div className="quest-tracker">
      <span className="quest-clock">{gameClock}</span>
      {step && <p>{step.objective[lang]}</p>}
    </div>
  )
}
