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
  /**
   * Усі паузи розв'язано: коли відео дійде до цієї секунди (після останнього слова звучить відповідь),
   * урок завершується й показується підсумок. null: до кінця ще є що розв'язувати.
   */
  endAt?: number | null
  /**
   * Повторне проходження вже правильно пройденої паузи («Повторити це слово»): її результат у `results`
   * лишається, а гірший результат повтору не зберігається. null: звичайне проходження.
   */
  practiceGapId?: string | null
  /** Результат повтору для екрана зворотного зв'язку (у `results` не потрапляє). */
  practiceResult?: GapResult | null
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
/**
 * Скільки секунд після останньої паузи ще звучить відповідь, перш ніж показати підсумок,
 * якщо останні паузи перемотали (SEEK). Після відповіді на останню паузу підсумок одразу.
 */
export const FINISH_TAIL_SEC = 2
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
    endAt: null,
    practiceGapId: null,
    practiceResult: null,
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

/** На скільки секунд відмотуємо до паузи, щоб знову почути контекст («Ще раз», повтор слова). */
export const CONTEXT_LEAD_SEC = 4

/** Стрілки «попереднє / наступне слово» ставлять відео на стільки секунд до паузи: коротко, щоб перехід відчувався як перехід до слова. */
export const WORD_JUMP_LEAD_SEC = 2

/** Початок відрізка слова для стрілок: трохи контексту, але не раніше за попередню паузу (близькі слова не зливаються). */
function wordStart(lesson: Lesson, index: number): number {
  const gap = lesson.gaps[index]
  const prev = lesson.gaps[index - 1]
  return Math.max(0, prev ? prev.pauseAt + 0.1 : 0, gap.pauseAt - WORD_JUMP_LEAD_SEC)
}

/**
 * Куди перемотати стрілками «попереднє / наступне слово», як треки в плеєрі. Наступне: початок відрізка першого
 * слова, чий відрізок ще попереду (близьке слово не перескакуємо; якщо відрізок уже почався, це «поточне» слово,
 * і стрілка веде до наступного). Попереднє: початок відрізка останньої паузи позаду (або початок відео).
 * null, якщо в цей бік перемотувати нікуди.
 */
export function wordJumpTarget(lesson: Lesson, time: number, dir: 'prev' | 'next'): number | null {
  if (dir === 'prev') {
    const behind = lesson.gaps.findLastIndex((g) => g.pauseAt < time - 1)
    if (behind >= 0) return wordStart(lesson, behind)
    return time > 0.5 ? 0 : null
  }
  const ahead = lesson.gaps.findIndex((_, i) => wordStart(lesson, i) > time + 0.05)
  return ahead < 0 ? null : wordStart(lesson, ahead)
}

/** Затиснута перемотка вперед зупиняється за стільки секунд до нерозв'язаної паузи: далі відео саме доходить до неї. */
export const HOLD_STOP_LEAD_SEC = 0.3

/**
 * Один крок перемотки, поки палець затиснутий на краю відео. Назад: на step секунд, не раніше за 0.
 * Вперед: на step, але не далі ніж трохи до найближчої паузи, на яку ще не відповіли (її не перескакуємо).
 * null: далі в цей бік не можна.
 */
export function holdSeekTarget(lesson: Lesson, state: MachineState, time: number, dir: 'back' | 'forward', step: number): number | null {
  if (dir === 'back') return time > 0.05 ? Math.max(0, time - step) : null
  const open = lesson.gaps.find(
    (g) => g.pauseAt > time && (g.id === state.practiceGapId || !state.results.some((r) => r.gapId === g.id)),
  )
  const limit = open ? open.pauseAt - HOLD_STOP_LEAD_SEC : Infinity
  if (limit <= time + 0.05) return null
  return Math.min(time + step, limit)
}

/** Коли завершити урок, якщо наступної нерозв'язаної паузи вже немає: після звучання останньої відповіді. */
function finishTime(lesson: Lesson, nextIndex: number): number | null {
  if (nextIndex < lesson.gaps.length) return null
  const last = lesson.gaps[lesson.gaps.length - 1]
  return last ? last.pauseAt + FINISH_TAIL_SEC : null
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

/** Підсумок уроку: усі паузи розв'язано. */
function finish(lesson: Lesson, state: MachineState): MachineState {
  return { ...state, status: 'ended', outcome: computeOutcome(lesson, state.results), endAt: null, practiceGapId: null, practiceResult: null }
}

function resolve(lesson: Lesson, state: MachineState, gap: Gap, resolution: GapResolution, heard = state.heard): MachineState {
  // Повтор уже правильної паузи: показуємо його результат, але в підсумок він не йде (кращий результат лишається).
  const next: MachineState =
    state.practiceGapId === gap.id
      ? { ...state, status: 'feedback', heard, practiceResult: { gapId: gap.id, resolution, attempts: state.attempts, heard } }
      : { ...state, status: 'feedback', heard, results: [...state.results, { gapId: gap.id, resolution, attempts: state.attempts, heard }] }
  // Останнє слово сказане правильно: підсумок одразу, без «¡Muy bien!» і без хвоста відео.
  if (resolution === 'correct' && firstUnresolvedIndex(lesson, next.results) >= lesson.gaps.length) return finish(lesson, next)
  return next
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
      if (state.status !== 'playing') return state
      // Усі слова пройдено: підсумок одразу після відповіді, не чекаючи кінця відео.
      if (state.endAt != null && event.time >= state.endAt) {
        return { ...state, status: 'ended', outcome: computeOutcome(lesson, state.results) }
      }
      if (!gap) return state
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
      const practiced = state.practiceGapId ? lesson.gaps.find((g) => g.id === state.practiceGapId) : undefined
      if (practiced && event.time >= practiced.pauseAt - PAUSE_LEAD) {
        // Перемотали за слово, яке повторювали: повтор скасовано.
        const results = [...state.results, ...passed]
        const next = Math.max(gapIndex, firstUnresolvedIndex(lesson, results))
        return {
          ...state,
          status: 'playing',
          gapIndex: next,
          attempts: 0,
          hintShown: false,
          lastVerdict: null,
          heard: [],
          results,
          practiceGapId: null,
          practiceResult: null,
          endAt: finishTime(lesson, next),
        }
      }
      if (passed.length > 0) {
        const results = [...state.results, ...passed]
        const next = Math.max(gapIndex, firstUnresolvedIndex(lesson, results))
        return {
          ...state,
          status: 'playing',
          endAt: finishTime(lesson, next),
          gapIndex: next,
          attempts: 0,
          hintShown: false,
          lastVerdict: null,
          heard: [],
          results,
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
      if (idx === -1 || !old) return state
      const reset = { status: 'playing' as const, gapIndex: idx, attempts: 0, hintShown: false, lastVerdict: null, heard: [], endAt: null, practiceResult: null }
      // Правильну паузу можна повторити для практики: результат у `results` лишається, гірший повтор його не псує.
      if (old.resolution === 'correct') return { ...state, ...reset, practiceGapId: event.gapId }
      // Решту (перемотано, показано, пропущено) відповідаємо наново: старий результат замінюється новим.
      return { ...state, ...reset, practiceGapId: null, results: state.results.filter((r) => r.gapId !== event.gapId) }
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
      if (event.verdict === 'correct') return resolve(lesson, { ...state, lastVerdict: 'correct' }, gap, 'correct', heard)
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
      return attempts >= gap.maxAttempts ? resolve(lesson, next, gap, 'revealed') : next
    }

    case 'SKIP':
      if (!gap || !isAnswering(state)) return state
      return resolve(lesson, { ...state, lastVerdict: null }, gap, 'skipped')

    case 'CONTINUE':
      if (state.status !== 'feedback') return state
      // Остання пауза (показана чи пропущена): «Далі» відкриває підсумок одразу.
      if (firstUnresolvedIndex(lesson, state.results) >= lesson.gaps.length) return finish(lesson, state)
      return {
        ...state,
        status: 'playing',
        // Після повтору старої паузи наступною буде перша ще не розв'язана, а не просто сусідня.
        gapIndex: firstUnresolvedIndex(lesson, state.results),
        practiceGapId: null,
        practiceResult: null,
        endAt: null,
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
