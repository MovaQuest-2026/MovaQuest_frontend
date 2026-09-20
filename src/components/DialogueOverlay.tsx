import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/useGameStore'

export function DialogueOverlay() {
  const { t } = useTranslation()
  const activeDialogue = useGameStore((state) => state.activeDialogue)
  const setActiveDialogue = useGameStore((state) => state.setActiveDialogue)

  if (!activeDialogue) return null

  return (
    <div className="dialogue-overlay">
      <p>Dialogue: {activeDialogue}</p>
      <button type="button" onClick={() => setActiveDialogue(null)}>
        {t('world.close')}
      </button>
    </div>
  )
}
