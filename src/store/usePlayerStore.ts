import { create } from 'zustand'
import { trackLessonStarted } from '../api/analytics'
import {
  createInitialState,
  restoreState,
  transition,
  type GapResult,
  type MachineEvent,
  type MachineState,
} from '../features/player/gapMachine'
import { trackTransition } from '../features/player/playerAnalytics'
import type { Lesson, Outcome } from '../types/lesson'
import { useUserStore } from './useUserStore'

export interface LessonRunResult {
  lessonId: string
  outcome: Outcome
  results: GapResult[]
}

interface PlayerState {
  lesson: Lesson | null
  machine: MachineState | null
  /** Секунда, з якої стартує відео (відновлення незавершеного уроку). */
  startAt: number
  /** Відтворення запущене: урок стартує сам одразу після завантаження. */
  started: boolean
  /** Відео грає без звуку, поки користувач не торкнеться сторінки (політика автозапуску браузерів). */
  muted: boolean
  startTracked: boolean
  userPaused: boolean
  currentTime: number
  duration: number
  /** Підсумок останнього пройденого уроку; переживає вихід з плеєра. */
  lastResult: LessonRunResult | null

  load: (lesson: Lesson) => void
  dispatch: (event: MachineEvent) => void
  start: () => void
  setMuted: (muted: boolean) => void
  setUserPaused: (paused: boolean) => void
  /** Час відео: оновлює прогрес і перевіряє, чи не час ставити паузу. */
  setProgress: (currentTime: number, duration: number) => void
  unload: () => void
}

const emptySession = {
  lesson: null,
  machine: null,
  startAt: 0,
  started: false,
  muted: false,
  startTracked: false,
  userPaused: false,
  currentTime: 0,
  duration: 0,
}

// Тимчасовий стан плеєра (не persist). Логіка переходів — у gapMachine.
export const usePlayerStore = create<PlayerState>()((set, get) => ({
  ...emptySession,
  lastResult: null,

  // Незавершений урок продовжується з останньої паузи, інакше починається спочатку.
  load: (lesson) => {
    const { activeLesson } = useUserStore.getState()
    const restored = activeLesson?.lessonId === lesson.id ? restoreState(lesson, activeLesson.machine) : null
    set({
      ...emptySession,
      lesson,
      machine: restored?.state ?? createInitialState(),
      startAt: restored?.startAt ?? 0,
    })
  },

  dispatch: (event) => {
    const { lesson, machine, started } = get()
    if (!lesson || !machine) return
    const next = transition(lesson, machine, event)
    if (next === machine) return
    const ended = next.status === 'ended' && next.outcome
    set({
      machine: next,
      ...(ended ? { lastResult: { lessonId: lesson.id, outcome: next.outcome!, results: next.results } } : {}),
    })
    const user = useUserStore.getState()
    if (ended) {
      const correct = next.results.filter((r) => r.resolution === 'correct').length
      user.recordLessonResult(lesson.id, next.outcome!, correct, lesson.gaps.length)
      user.setActiveLesson(null)
    } else if (started) {
      user.setActiveLesson({ lessonId: lesson.id, machine: next })
    }
    trackTransition(lesson, machine, next, event)
  },

  start: () => {
    const { lesson, machine, startTracked } = get()
    set({ started: true, startTracked: true, userPaused: false })
    if (!lesson || !machine) return
    useUserStore.getState().setActiveLesson({ lessonId: lesson.id, machine })
    if (!startTracked) trackLessonStarted(lesson.id)
  },
  setMuted: (muted) => set({ muted }),
  setUserPaused: (userPaused) => set({ userPaused }),
  setProgress: (currentTime, duration) => {
    set({ currentTime, duration })
    if (get().machine?.status === 'playing') get().dispatch({ type: 'TIME_UPDATE', time: currentTime })
  },
  unload: () => set(emptySession),
}))
