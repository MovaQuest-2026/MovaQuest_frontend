import { useEffect } from 'react'
import {
  trackDialogueFinished,
  trackDoorEntered,
  trackSessionResumed,
  trackZoneEntered,
} from '../api/analytics'
import { useGameStore } from './useGameStore'

// session_resumed — один раз на завантаження сторінки, якщо світ відкрито зі збереження.
let sessionChecked = false

// Події світу з тих змін стору, які пишуть сцени й оверлеї.
// quest_step_completed надсилає useQuestEngine, quiz_answered — DialogueOverlay.
export function useAnalytics() {
  useEffect(() => {
    if (!sessionChecked) {
      sessionChecked = true
      const { questStep, currentZone } = useGameStore.getState()
      if (questStep !== null) trackSessionResumed(currentZone, questStep)
    }

    return useGameStore.subscribe((state, prev) => {
      if (state.currentZone && state.currentZone !== prev.currentZone) {
        trackZoneEntered(state.currentZone, state.gameClock)
      }
      if (state.lastDoorEntered && state.lastDoorEntered !== prev.lastDoorEntered) {
        trackDoorEntered(state.lastDoorEntered.doorId, state.lastDoorEntered.zoneId)
      }
      if (
        state.lastFinishedDialogue &&
        state.lastFinishedDialogue !== prev.lastFinishedDialogue
      ) {
        trackDialogueFinished(state.lastFinishedDialogue.dialogueId)
      }
    })
  }, [])
}
