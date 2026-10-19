import { useEffect } from 'react'
import { trackQuestStepCompleted } from '../api/analytics'
import {
  completedStepIds,
  evaluate,
  type QuestEvent,
} from '../game/quests/questEngine'
import { useGameStore } from './useGameStore'

function runQuestEngine(event: QuestEvent) {
  const state = useGameStore.getState()
  if (!state.questline) return
  const patch = evaluate(state.questline, state, event)
  if (!patch) return

  // Перший крок квесту — точка відліку для msSinceStart.
  const startedAt =
    state.startedAt ?? (patch.questStep !== null ? Date.now() : null)
  useGameStore.setState({ ...patch, startedAt })

  for (const stepId of completedStepIds(state.questline, state.questStep, patch.questStep)) {
    // Кроки, закриті через skipWhen (галявина після left_glade), не рахуємо пройденими.
    const skipFlag = state.questline.steps.find((step) => step.id === stepId)?.skipWhen?.flag
    if (skipFlag && patch.flags[skipFlag] === true) continue
    trackQuestStepCompleted(stepId, startedAt === null ? null : Date.now() - startedAt)
  }
}

// Підключає квест-двигун до стору: події з flags, кінця діалогу і зміни зони.
export function useQuestEngine() {
  useEffect(() => {
    runQuestEngine({ type: 'flag' })

    return useGameStore.subscribe((state, prev) => {
      if (state.questline !== prev.questline) {
        runQuestEngine({ type: 'flag' })
      }
      if (
        state.lastFinishedDialogue &&
        state.lastFinishedDialogue !== prev.lastFinishedDialogue
      ) {
        runQuestEngine({
          type: 'dialogueFinished',
          dialogueId: state.lastFinishedDialogue.dialogueId,
        })
      }
      if (state.currentZone && state.currentZone !== prev.currentZone) {
        runQuestEngine({ type: 'zoneEntered', zoneId: state.currentZone })
      }
      if (state.flags !== prev.flags) {
        runQuestEngine({ type: 'flag' })
      }
    })
  }, [])
}
