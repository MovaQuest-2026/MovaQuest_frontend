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
/** passed: користувач перемотав відео за паузу, не відповівши. */
export type GapResolution = 'correct' | 'revealed' | 'skipped' | 'passed'

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
  /** Перемотка (повзунок, ±5 с). Вперед за нерозв'язані паузи: вони стають passed. */
  | { type: 'SEEK'; time: number }
  /** Повернутися до вже пройденої паузи, яку не розв'язано правильно (кружечок зверху), і відповісти ще раз. */
  | { type: 'RETRY_GAP'; gapId: string }
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

/** Скільки секунд після паузи ще звучить відповідь: до цього моменту відрізок належить цій паузі. */
export const ANSWER_TAIL_SEC = 1.5

/**
 * Пауза, до відрізка якої належить час `time`: питання перед нею і звучання відповіді після неї.
 * Для близьких пауз хвіст не більший за половину відстані до наступної, щоб відрізки не заходили один на одного.
 */
export function gapAtTime(lesson: Lesson, time: number): Gap | null {
  return (
    lesson.gaps.find((g, i) => {
      const next = lesson.gaps[i + 1]
      const tail = next ? Math.min(ANSWER_TAIL_SEC, (next.pauseAt - g.pauseAt) / 2) : ANSWER_TAIL_SEC
      return time <= g.pauseAt + tail
    }) ?? null
  )
}

/** Індекс першої паузи без результату (наступна, яку треба розв'язати), або довжина списку. */
function firstUnresolvedIndex(lesson: Lesson, results: GapResult[]): number {
  const idx = lesson.gaps.findIndex((g) => !results.some((r) => r.gapId === g.id))
  return idx === -1 ? lesson.gaps.length : idx
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

    case 'SEEK': {
      if (state.status !== 'playing' && state.status !== 'awaitingAnswer') return state
      // Усі паузи, які лишаються позаду нової позиції, зараховуємо як перемотані.
      let gapIndex = state.gapIndex
      const passed: GapResult[] = []
      while (lesson.gaps[gapIndex] && event.time >= lesson.gaps[gapIndex].pauseAt - PAUSE_LEAD) {
        const current = gapIndex === state.gapIndex
        // Паузи, які вже мають результат (після RETRY_GAP), другий раз не зараховуємо.
        if (state.results.some((r) => r.gapId === lesson.gaps[gapIndex].id)) {
          gapIndex++
          continue
        }
        passed.push({
          gapId: lesson.gaps[gapIndex].id,
          resolution: 'passed',
          // Спроби й почуте на поточній паузі лишаються в підсумку.
          attempts: current ? state.attempts : 0,
          heard: current ? state.heard : [],
        })
        gapIndex++
      }
      if (passed.length > 0) {
        return {
          ...state,
          status: 'playing',
          gapIndex: Math.max(gapIndex, firstUnresolvedIndex(lesson, [...state.results, ...passed])),
          attempts: 0,
          hintShown: false,
          lastVerdict: null,
          heard: [],
          results: [...state.results, ...passed],
        }
      }
      // Назад з паузи: контекст звучить знову, як «Ще раз».
      return state.status === 'awaitingAnswer' ? { ...state, status: 'playing' } : state
    }

    case 'RETRY_GAP': {
      // Зі «зворотного зв'язку» теж можна: кнопка «Спробувати ще раз» біля «Далі».
      if (state.status !== 'playing' && state.status !== 'awaitingAnswer' && state.status !== 'feedback') return state
      const idx = lesson.gaps.findIndex((g) => g.id === event.gapId)
      const old = state.results.find((r) => r.gapId === event.gapId)
      // Повторити можна лише пройдену паузу, яку не розв'язано правильно.
      if (idx === -1 || !old || old.resolution === 'correct') return state
      return {
        ...state,
        status: 'playing',
        gapIndex: idx,
        attempts: 0,
        hintShown: false,
        lastVerdict: null,
        heard: [],
        results: state.results.filter((r) => r.gapId !== event.gapId),
      }
    }

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
        // Після повтору старої паузи наступною буде перша ще не розв'язана, а не просто сусідня.
        gapIndex: firstUnresolvedIndex(lesson, state.results),
        attempts: 0,
        hintShown: false,
        lastVerdict: null,
        heard: [],
      }
  }
}

/** Позиція перемотки в межах відео. Перемотувати можна будь-куди, див. подію SEEK. */
export function clampSeek(time: number, duration: number): number {
  const max = Number.isFinite(duration) && duration > 0 ? duration : time
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
