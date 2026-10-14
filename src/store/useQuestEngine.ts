import { useEffect } from 'react'
import { evaluate, type QuestEvent } from '../game/quests/questEngine'
import { useGameStore } from './useGameStore'

function runQuestEngine(event: QuestEvent) {
  const state = useGameStore.getState()
  if (!state.questline) return
  const patch = evaluate(state.questline, state, event)
  if (patch) useGameStore.setState(patch)
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
