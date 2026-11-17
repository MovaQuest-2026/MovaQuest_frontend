import {
  trackAnswerChecked,
  trackGapReached,
  trackGapResolved,
  trackHintShown,
  trackLessonCompleted,
} from '../../api/analytics'
import type { Lesson } from '../../types/lesson'
import type { MachineEvent, MachineState } from './gapMachine'

// Переводить переходи автомата в події аналітики. Викликається зі стору після кожного dispatch.
export function trackTransition(lesson: Lesson, prev: MachineState, next: MachineState, event: MachineEvent) {
  const gap = lesson.gaps[prev.gapIndex]

  if (gap && prev.status === 'playing' && next.status === 'awaitingAnswer') trackGapReached(lesson.id, gap.id)

  if (gap && event.type === 'RESULT' && next !== prev) {
    trackAnswerChecked(lesson.id, gap.id, event.verdict, event.source, prev.attempts + 1)
  }

  if (gap && next.hintShown && !prev.hintShown) trackHintShown(lesson.id, gap.id)

  // Перемотка може розв'язати кілька пауз за раз.
  for (const r of next.results.slice(prev.results.length)) trackGapResolved(lesson.id, r.gapId, r.resolution, r.attempts)

  if (next.status === 'ended' && prev.status !== 'ended' && next.outcome) {
    const correct = next.results.filter((r) => r.resolution === 'correct').length
    trackLessonCompleted(lesson.id, next.outcome, correct, lesson.gaps.length)
  }
}
