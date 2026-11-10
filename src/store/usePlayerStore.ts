import { create } from 'zustand'
import { trackLessonStarted, trackSceneStarted } from '../api/analytics'
import { trackTransition } from '../features/player/playerAnalytics'
import {
  createInitialState,
  getScene,
  restoreState,
  transition,
  type HistoryEntry,
  type MachineEvent,
  type MachineState,
  type Outcome,
} from '../features/player/sceneMachine'
import type { Lesson, Scene } from '../types/lesson'
import { useUserStore } from './useUserStore'

export interface LessonRunResult {
  lessonId: string
  outcome: Outcome
  history: HistoryEntry[]
}

interface PlayerState {
  lesson: Lesson | null
  machine: MachineState | null
  /** Відтворення запущене (дотиком «Tap to start» або автоматично після жесту). */
  started: boolean
  startTracked: boolean
  userPaused: boolean
  currentTime: number
  duration: number
  /** Підсумок останнього пройденого уроку; переживає вихід з плеєра. */
  lastResult: LessonRunResult | null

  load: (lesson: Lesson) => void
  dispatch: (event: MachineEvent) => void
  start: () => void
  /** Браузер не дав відтворити зі звуком: знову показуємо «Tap to start». */
  playBlocked: () => void
  setUserPaused: (paused: boolean) => void
  setProgress: (currentTime: number, duration: number) => void
  unload: () => void
}

const emptySession = {
  lesson: null,
  machine: null,
  started: false,
  startTracked: false,
  userPaused: false,
  currentTime: 0,
  duration: 0,
}

// Тимчасовий стан плеєра (не persist). Логіка переходів — у sceneMachine.
export const usePlayerStore = create<PlayerState>()((set, get) => ({
  ...emptySession,
  lastResult: null,

  // Незавершений урок продовжується з поточної сцени, інакше починається спочатку.
  load: (lesson) => {
    const { activeLesson } = useUserStore.getState()
    const restored = activeLesson?.lessonId === lesson.id ? restoreState(lesson, activeLesson.machine) : null
    set({ ...emptySession, lesson, machine: restored ?? createInitialState(lesson) })
  },

  dispatch: (event) => {
    const { lesson, machine, started } = get()
    if (!lesson || !machine) return
    const next = transition(lesson, machine, event)
    if (next === machine) return
    const sceneChanged = next.entryId !== machine.entryId
    const ended = next.status === 'ended' && next.outcome
    set({
      machine: next,
      ...(sceneChanged ? { currentTime: 0, duration: 0, userPaused: false } : {}),
      ...(ended ? { lastResult: { lessonId: lesson.id, outcome: next.outcome!, history: next.history } } : {}),
    })
    const user = useUserStore.getState()
    if (ended) {
      user.recordLessonResult(lesson.id, next.outcome!)
      user.setActiveLesson(null)
    } else if (started) {
      user.setActiveLesson({ lessonId: lesson.id, machine: next })
    }
    trackTransition(lesson, machine, next, event, started)
  },

  start: () => {
    const { lesson, machine, startTracked } = get()
    set({ started: true, startTracked: true, userPaused: false })
    if (!lesson || !machine) return
    useUserStore.getState().setActiveLesson({ lessonId: lesson.id, machine })
    if (startTracked) return
    trackLessonStarted(lesson.id)
    // Якщо кліп уже готовий, CLIP_READY відбувся до старту — фіксуємо сцену тут.
    if (machine.status === 'playing') trackSceneStarted(lesson.id, machine.currentSceneId)
  },
  playBlocked: () => set({ started: false }),
  setUserPaused: (userPaused) => set({ userPaused }),
  setProgress: (currentTime, duration) => set({ currentTime, duration }),
  unload: () => set(emptySession),
}))

export function selectCurrentScene(s: PlayerState): Scene | null {
  return s.lesson && s.machine ? getScene(s.lesson, s.machine.currentSceneId) : null
}

export function clipUrl(lessonId: string, clipId: string): string {
  return `/clips/${lessonId}/${clipId}.mp4`
}
