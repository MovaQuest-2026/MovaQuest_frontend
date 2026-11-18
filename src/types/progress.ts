import type { MachineState } from '../features/player/gapMachine'
import type { Outcome } from './lesson'

// Прогрес акаунта. Форми збігаються з бекендом (/api/v1/me/progress, docs/backend-requirements.md §6.3),
// тож відповіді кладемо в сховище без перетворень.

export interface CompletedLesson {
  outcome: Outcome
  /** Скільки пауз розв'язано правильно з усіх. */
  correct: number
  total: number
  completedAt: string // ISO
}

/** Знімок незавершеного уроку й час (з пристрою), коли його зроблено: пізніший перемагає. */
export interface ActiveLesson {
  machine: MachineState
  updatedAt: string // ISO
}

export interface Progress {
  completedLessons: Record<string, CompletedLesson>
  /** Вивчені слова: lessonId → id пауз, на які відповіли правильно. */
  learnedWords: Record<string, string[]>
  /** Незавершені уроки: lessonId → знімок автомата уроку. */
  activeLessons: Record<string, ActiveLesson>
}

export const emptyProgress = (): Progress => ({ completedLessons: {}, learnedWords: {}, activeLessons: {} })

const later = (a: string, b: string) => Date.parse(a) > Date.parse(b)

/**
 * Злиття двох копій прогресу за правилами сервера (§6.2): результат уроку з більшим `correct`
 * (рівний — з `incoming`), слова об'єднуються, знімок — пізніший `updatedAt`. Знімок, зроблений
 * раніше за завершення цього уроку, відкидається: інакше запізнілий запис воскресить пройдений урок.
 */
export function mergeProgress(base: Progress, incoming: Progress): Progress {
  const completedLessons = { ...base.completedLessons }
  for (const [id, next] of Object.entries(incoming.completedLessons)) {
    const prev = completedLessons[id]
    if (!prev || next.correct >= prev.correct) completedLessons[id] = next
  }

  const learnedWords: Record<string, string[]> = { ...base.learnedWords }
  for (const [id, gaps] of Object.entries(incoming.learnedWords)) {
    const prev = learnedWords[id] ?? []
    learnedWords[id] = [...prev, ...gaps.filter((g) => !prev.includes(g))]
  }

  const activeLessons: Record<string, ActiveLesson> = {}
  const ids = new Set([...Object.keys(base.activeLessons), ...Object.keys(incoming.activeLessons)])
  for (const id of ids) {
    const a = base.activeLessons[id]
    const b = incoming.activeLessons[id]
    const pick = !a ? b : !b ? a : later(a.updatedAt, b.updatedAt) ? a : b
    const done = completedLessons[id]
    if (done && !later(pick.updatedAt, done.completedAt)) continue
    activeLessons[id] = pick
  }

  return { completedLessons, learnedWords, activeLessons }
}
