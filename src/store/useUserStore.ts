import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MachineState } from '../features/player/gapMachine'
import type { Lang, Lesson, Outcome } from '../types/lesson'

export type Level = Lesson['level']
export type { Outcome }
/** Іспанські субтитри увімкнено чи ні. */
export type SubtitleMode = 'on' | 'off'
export type PlaybackRate = 0.75 | 1
export type MicPermission = 'unknown' | 'granted' | 'denied' | 'skipped' | 'unsupported'

/** Незавершений урок, який відкриває вкладка «Головна». */
export interface ActiveLesson {
  lessonId: string
  machine: MachineState
}

export interface CompletedLesson {
  outcome: Outcome
  /** Скільки пауз розв'язано правильно з усіх. */
  correct: number
  total: number
  completedAt: string // ISO
}

interface UserState {
  userId: string
  interfaceLanguage: Lang
  level: Level
  goal: string
  onboardingDone: boolean
  micPermission: MicPermission
  subtitleMode: SubtitleMode
  playbackRate: PlaybackRate
  completedLessons: Record<string, CompletedLesson>
  activeLesson: ActiveLesson | null

  setInterfaceLanguage: (lang: Lang) => void
  setLevel: (level: Level) => void
  setGoal: (goal: string) => void
  setMicPermission: (permission: MicPermission) => void
  setSubtitleMode: (mode: SubtitleMode) => void
  setPlaybackRate: (rate: PlaybackRate) => void
  completeOnboarding: () => void
  recordLessonResult: (lessonId: string, outcome: Outcome, correct: number, total: number) => void
  resetProgress: () => void
  setActiveLesson: (active: ActiveLesson | null) => void
}

// crypto.randomUUID є лише в secure context, тож для http://192.168.x.x потрібен запасний шлях.
function createUserId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: createUserId(),
      interfaceLanguage: 'en',
      level: 'A2',
      goal: '',
      onboardingDone: false,
      micPermission: 'unknown',
      subtitleMode: 'on',
      playbackRate: 1,
      completedLessons: {},
      activeLesson: null,

      setInterfaceLanguage: (interfaceLanguage) => set({ interfaceLanguage }),
      setLevel: (level) => set({ level }),
      setGoal: (goal) => set({ goal }),
      setMicPermission: (micPermission) => set({ micPermission }),
      setSubtitleMode: (subtitleMode) => set({ subtitleMode }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      completeOnboarding: () => set({ onboardingDone: true }),
      recordLessonResult: (lessonId, outcome, correct, total) =>
        set((s) => ({
          completedLessons: {
            ...s.completedLessons,
            [lessonId]: { outcome, correct, total, completedAt: new Date().toISOString() },
          },
        })),
      resetProgress: () => set({ completedLessons: {}, activeLesson: null }),
      setActiveLesson: (activeLesson) => set({ activeLesson }),
    }),
    {
      name: 'movaquest-user-v1',
      version: 2,
      // v2: уроки стали відео з паузами. Старий прогрес (сцени й гілки) не переноситься,
      // режими субтитрів з перекладом стають просто «увімкнено».
      migrate: (persisted, version) => {
        const state = persisted as Partial<UserState>
        if (version >= 2) return state
        const subtitleMode: SubtitleMode = (state.subtitleMode as string) === 'off' ? 'off' : 'on'
        return { ...state, subtitleMode, completedLessons: {}, activeLesson: null }
      },
    },
  ),
)

// Записуємо стан одразу, щоб згенерований userId пережив перезавантаження.
useUserStore.setState((s) => ({ userId: s.userId }))
