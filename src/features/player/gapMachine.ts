// Автомат уроку «скажи, що далі». Чиста логіка без React: (lesson, state, event) -> state.
import type { Verdict } from '../../lib/matchAnswer'
import type { Gap, Lesson, Outcome } from '../../types/lesson'

export type PlayerStatus =
  | 'loading'
  | 'playing'
  | 'awaitingAnswer'
  | 'listening'
  | 'evaluating'
  /** Відповідь зарахована, показана або пропущена; чекаємо CONTINUE. */
  | 'feedback'
  | 'ended'

export type InputSource = 'voice' | 'text'
export type GapResolution = 'correct' | 'revealed' | 'skipped'

export interface GapResult {
  gapId: string
  resolution: GapResolution
  /** Невдалі (wrong) спроби до розв'язання. */
  attempts: number
  /** Що користувач сказав або набрав (для екрана результату). */
  heard: string[]
}

export interface MachineState {
  status: PlayerStatus
  /** Індекс наступної нерозв'язаної паузи в lesson.gaps. */
  gapIndex: number
  attempts: number
  hintShown: boolean
  lastVerdict: Verdict | null
  heard: string[]
  results: GapResult[]
  outcome: Outcome | null
}

export type MachineEvent =
  | { type: 'CLIP_READY' }
  | { type: 'TIME_UPDATE'; time: number }
  | { type: 'CLIP_ENDED' }
  | { type: 'REPLAY' }
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'CANCEL_LISTENING' }
  | { type: 'RESULT'; verdict: Verdict; heard: string; source: InputSource }
  | { type: 'SHOW_HINT' }
  | { type: 'SKIP' }
  | { type: 'CONTINUE' }

/** Пауза спрацьовує трохи раніше, щоб не «з'їсти» початок слова. */
export const PAUSE_LEAD = 0.05
/** При відновленні уроку на паузі відео починається трохи раніше, щоб знову почути контекст. */
export const RESUME_CONTEXT_SEC = 4

export function createInitialState(): MachineState {
  return {
    status: 'loading',
    gapIndex: 0,
    attempts: 0,
    hintShown: false,
    lastVerdict: null,
    heard: [],
    results: [],
    outcome: null,
  }
}

export function currentGap(lesson: Lesson, state: MachineState): Gap | null {
  return lesson.gaps[state.gapIndex] ?? null
}

const ANSWERABLE: PlayerStatus[] = ['awaitingAnswer', 'listening', 'evaluating']

export function isAnswering(state: MachineState): boolean {
  return ANSWERABLE.includes(state.status)
}

function resolve(state: MachineState, gap: Gap, resolution: GapResolution, heard = state.heard): MachineState {
  return {
    ...state,
    status: 'feedback',
    heard,
    results: [...state.results, { gapId: gap.id, resolution, attempts: state.attempts, heard }],
  }
}

export function computeOutcome(lesson: Lesson, results: GapResult[]): Outcome {
  const total = lesson.gaps.length
  const correct = results.filter((r) => r.resolution === 'correct').length
  if (correct === total) return 'perfect'
  if (correct * 2 < total) return 'missed'
  return 'partial'
}

export function transition(lesson: Lesson, state: MachineState, event: MachineEvent): MachineState {
  if (state.status === 'ended') return state
  const gap = currentGap(lesson, state)

  switch (event.type) {
    case 'CLIP_READY':
      return state.status === 'loading' ? { ...state, status: 'playing' } : state

    case 'TIME_UPDATE':
      if (state.status !== 'playing' || !gap) return state
      return event.time >= gap.pauseAt - PAUSE_LEAD ? { ...state, status: 'awaitingAnswer' } : state

    case 'REPLAY':
      // Перемотка назад на паузі: контекст звучить знову, спроби зберігаються.
      return state.status === 'awaitingAnswer' ? { ...state, status: 'playing' } : state

    case 'CLIP_ENDED':
      if (state.status !== 'playing') return state
      return { ...state, status: 'ended', outcome: computeOutcome(lesson, state.results) }

    case 'START_LISTENING':
      return state.status === 'awaitingAnswer' ? { ...state, status: 'listening' } : state

    case 'STOP_LISTENING':
      return state.status === 'listening' ? { ...state, status: 'evaluating' } : state

    case 'CANCEL_LISTENING':
      return state.status === 'listening' || state.status === 'evaluating'
        ? { ...state, status: 'awaitingAnswer' }
        : state

    case 'SHOW_HINT':
      return isAnswering(state) ? { ...state, hintShown: true } : state

    case 'RESULT': {
      if (!gap || !isAnswering(state)) return state
      const heard = event.heard.trim() ? [...state.heard, event.heard.trim()] : state.heard
      if (event.verdict === 'correct') return resolve({ ...state, lastVerdict: 'correct' }, gap, 'correct', heard)
      if (event.verdict === 'unclear') {
        // Нерозбірливо: спроба не зараховується, просто просимо повторити.
        return { ...state, status: 'awaitingAnswer', lastVerdict: 'unclear', heard }
      }
      const attempts = state.attempts + 1
      const next: MachineState = {
        ...state,
        status: 'awaitingAnswer',
        attempts,
        lastVerdict: 'wrong',
        // Після першої помилки підказка відкривається сама.
        hintShown: true,
        heard,
      }
      return attempts >= gap.maxAttempts ? resolve(next, gap, 'revealed') : next
    }

    case 'SKIP':
      if (!gap || !isAnswering(state)) return state
      return resolve({ ...state, lastVerdict: null }, gap, 'skipped')

    case 'CONTINUE':
      if (state.status !== 'feedback') return state
      return {
        ...state,
        status: 'playing',
        gapIndex: state.gapIndex + 1,
        attempts: 0,
        hintShown: false,
        lastVerdict: null,
        heard: [],
      }
  }
}

/**
 * Користувач може перемотувати назад, але не перескочити нерозв'язану паузу.
 */
export function clampSeek(lesson: Lesson, state: MachineState, time: number, duration: number): number {
  const gap = currentGap(lesson, state)
  const max = gap ? gap.pauseAt - PAUSE_LEAD : duration
  return Math.min(Math.max(0, time), max)
}

/**
 * Відновлює збережений стан незавершеного уроку. Повертає стан і секунду, з якої
 * почати відео, або null, якщо знімок не підходить (урок змінився або завершений).
 */
export function restoreState(lesson: Lesson, saved: MachineState): { state: MachineState; startAt: number } | null {
  if (saved.status === 'ended') return null
  if (saved.gapIndex > lesson.gaps.length) return null
  const ids = new Set(lesson.gaps.map((g) => g.id))
  if (saved.results.some((r) => !ids.has(r.gapId))) return null

  // На екрані зворотного зв'язку пауза вже розв'язана: продовжуємо з наступної.
  const base = saved.status === 'feedback' ? transition(lesson, saved, { type: 'CONTINUE' }) : saved
  const wasAnswering = isAnswering(saved)
  const state: MachineState = {
    ...base,
    status: 'loading',
    ...(wasAnswering ? {} : { attempts: 0, hintShown: false, lastVerdict: null, heard: [] }),
    lastVerdict: null,
  }
  const gap = lesson.gaps[state.gapIndex]
  const prev = lesson.gaps[state.gapIndex - 1]
  const startAt = wasAnswering && gap ? Math.max(0, gap.pauseAt - RESUME_CONTEXT_SEC) : (prev?.pauseAt ?? 0)
  return { state, startAt }
}
