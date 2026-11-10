import { create } from 'zustand'
import { trackLessonStarted, trackSceneStarted } from '../api/analytics'
import { trackTransition } from '../features/player/playerAnalytics'
import {
  createInitialState,
  getScene,
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
  /** Перший дотик «Tap to start» був: після нього звук дозволено. */
  started: boolean
  userPaused: boolean
  currentTime: number
  duration: number
  /** Підсумок останнього пройденого уроку; переживає вихід з плеєра. */
  lastResult: LessonRunResult | null

  load: (lesson: Lesson) => void
  dispatch: (event: MachineEvent) => void
  start: () => void
  setUserPaused: (paused: boolean) => void
  setProgress: (currentTime: number, duration: number) => void
  unload: () => void
}

const emptySession = { lesson: null, machine: null, started: false, userPaused: false, currentTime: 0, duration: 0 }

// Тимчасовий стан плеєра (не persist). Логіка переходів — у sceneMachine.
export const usePlayerStore = create<PlayerState>()((set, get) => ({
  ...emptySession,
  lastResult: null,

  load: (lesson) => set({ ...emptySession, lesson, machine: createInitialState(lesson) }),

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
    if (ended) useUserStore.getState().recordLessonResult(lesson.id, next.outcome!)
    trackTransition(lesson, machine, next, event, started)
  },

  start: () => {
    const { lesson, machine, started } = get()
    set({ started: true, userPaused: false })
    if (!lesson || !machine || started) return
    trackLessonStarted(lesson.id)
    // Якщо кліп уже готовий, CLIP_READY відбувся до старту — фіксуємо сцену тут.
    if (machine.status === 'playing') trackSceneStarted(lesson.id, machine.currentSceneId)
  },
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
