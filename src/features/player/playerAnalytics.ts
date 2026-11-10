import {
  trackChoiceMade,
  trackLessonCompleted,
  trackPhrasesRevealed,
  trackRetry,
  trackSceneStarted,
} from '../../api/analytics'
import type { Lesson } from '../../types/lesson'
import type { MachineEvent, MachineState } from './sceneMachine'

// Переводить переходи автомата в події аналітики. Викликається зі стору після кожного dispatch.
export function trackTransition(
  lesson: Lesson,
  prev: MachineState,
  next: MachineState,
  event: MachineEvent,
  started: boolean,
) {
  const sceneId = prev.currentSceneId

  if (event.type === 'RESULT' && next !== prev) {
    trackChoiceMade(lesson.id, sceneId, event.branch, event.source)
    if (event.branch === 'unclear') trackRetry(lesson.id, sceneId, next.retryCount)
  }

  if (next.phrasesRevealed && !prev.phrasesRevealed) {
    trackPhrasesRevealed(lesson.id, next.lastChoiceSceneId ?? sceneId, next.autoRevealed)
  }

  if (started && prev.status === 'loading' && next.status === 'playing') {
    trackSceneStarted(lesson.id, next.currentSceneId)
  }

  if (next.status === 'ended' && prev.status !== 'ended' && next.outcome) {
    trackLessonCompleted(lesson.id, next.outcome)
  }
}
