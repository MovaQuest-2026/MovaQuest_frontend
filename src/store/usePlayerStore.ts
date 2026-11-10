import { create } from 'zustand'
import {
  createInitialState,
  getScene,
  transition,
  type MachineEvent,
  type MachineState,
} from '../features/player/sceneMachine'
import type { Lesson, Scene } from '../types/lesson'

interface PlayerState {
  lesson: Lesson | null
  machine: MachineState | null
  /** Перший дотик «Tap to start» був: після нього звук дозволено. */
  started: boolean
  userPaused: boolean
  currentTime: number
  duration: number

  load: (lesson: Lesson) => void
  dispatch: (event: MachineEvent) => void
  start: () => void
  setUserPaused: (paused: boolean) => void
  setProgress: (currentTime: number, duration: number) => void
  unload: () => void
}

const empty = { lesson: null, machine: null, started: false, userPaused: false, currentTime: 0, duration: 0 }

// Тимчасовий стан плеєра (не persist). Логіка переходів — у sceneMachine.
export const usePlayerStore = create<PlayerState>()((set, get) => ({
  ...empty,

  load: (lesson) => set({ ...empty, lesson, machine: createInitialState(lesson) }),

  dispatch: (event) => {
    const { lesson, machine } = get()
    if (!lesson || !machine) return
    const next = transition(lesson, machine, event)
    if (next === machine) return
    const sceneChanged = next.entryId !== machine.entryId
    set({
      machine: next,
      ...(sceneChanged ? { currentTime: 0, duration: 0, userPaused: false } : {}),
    })
  },

  start: () => set({ started: true, userPaused: false }),
  setUserPaused: (userPaused) => set({ userPaused }),
  setProgress: (currentTime, duration) => set({ currentTime, duration }),
  unload: () => set(empty),
}))

export function selectCurrentScene(s: PlayerState): Scene | null {
  return s.lesson && s.machine ? getScene(s.lesson, s.machine.currentSceneId) : null
}

export function clipUrl(lessonId: string, clipId: string): string {
  return `/clips/${lessonId}/${clipId}.mp4`
}
