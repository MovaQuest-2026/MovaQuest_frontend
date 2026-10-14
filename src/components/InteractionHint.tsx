import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/useGameStore'

export function InteractionHint() {
  const { t } = useTranslation()
  const hint = useGameStore((state) => state.interactionHint)
  const blocked = useGameStore(
    (state) => state.activeDialogue !== null || state.activeExercise !== null,
  )
  const requestInteract = useGameStore((state) => state.requestInteract)
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const [isTouch] = useState(
    () => window.matchMedia('(pointer: coarse)').matches,
  )

  if (!hint || blocked) return null

  const name = hint.label[nativeLanguage ?? 'en']

  if (isTouch) {
    return (
      <button
        type="button"
        className="interaction-hint"
        onClick={requestInteract}
      >
        {t(`world.interactTouch.${hint.kind}`, { name })}
      </button>
    )
  }

  return (
    <div className="interaction-hint" role="status">
      {t(`world.interact.${hint.kind}`, { name })}
    </div>
  )
}
