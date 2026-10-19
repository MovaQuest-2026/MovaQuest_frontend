import { useEffect } from 'react'
import {
  trackDialogueFinished,
  trackDoorEntered,
  trackSessionResumed,
  trackTravelCancelled,
  trackTravelConfirmed,
  trackZoneEntered,
} from '../api/analytics'
import { getAlphaProgress } from './alphaProgress'
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
      const decision = state.lastExitDecision
      if (decision && decision !== prev.lastExitDecision) {
        const { stationsDone, alphaScore } = getAlphaProgress(state.flags)
        if (decision.confirmed) {
          const toZone = state.cityConfig?.zones
            .find((zone) => zone.id === decision.zoneId)
            ?.exits.find((exit) => exit.id === decision.exitId)?.target
          trackTravelConfirmed(decision.zoneId, toZone ?? '', stationsDone, alphaScore)
        } else {
          trackTravelCancelled(decision.zoneId, stationsDone)
        }
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
