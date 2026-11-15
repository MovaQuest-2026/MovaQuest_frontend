import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MachineState } from '../features/player/gapMachine'
import type { Lang, Lesson, Outcome, SubtitleLang } from '../types/lesson'

export type Level = Lesson['level']
export type { Outcome }
export type { SubtitleLang }
/** Порядок рядків субтитрів: спершу оригінал, далі переклади. */
export const SUBTITLE_LANGS: SubtitleLang[] = ['es', 'en', 'uk']
/** system: як у налаштуваннях пристрою (prefers-color-scheme). */
export type ThemePreference = 'system' | 'light' | 'dark'
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
  /** Які мови субтитрів показувати. Порожній список: субтитри вимкнено. */
  subtitleLangs: SubtitleLang[]
  theme: ThemePreference
  playbackRate: PlaybackRate
  completedLessons: Record<string, CompletedLesson>
  activeLesson: ActiveLesson | null

  setInterfaceLanguage: (lang: Lang) => void
  setLevel: (level: Level) => void
  setGoal: (goal: string) => void
  setMicPermission: (permission: MicPermission) => void
  toggleSubtitleLang: (lang: SubtitleLang) => void
  setTheme: (theme: ThemePreference) => void
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

/**
 * Міграція збереженого стану.
 * v2: уроки стали відео з паузами, старий прогрес (сцени й гілки) не переноситься.
 * v3: замість «субтитри так/ні» список мов субтитрів; додано тему.
 */
export function migrateUserState(persisted: unknown, version: number): Record<string, unknown> {
  let state = { ...(persisted as Record<string, unknown>) }
  if (version < 2) state = { ...state, completedLessons: {}, activeLesson: null }
  if (version < 3) {
    const { subtitleMode, ...rest } = state
    const subtitleLangs: SubtitleLang[] = subtitleMode === 'off' ? [] : ['es']
    state = { ...rest, subtitleLangs, theme: 'system' }
  }
  return state
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
      subtitleLangs: ['es'],
      theme: 'system',
      playbackRate: 1,
      completedLessons: {},
      activeLesson: null,

      setInterfaceLanguage: (interfaceLanguage) => set({ interfaceLanguage }),
      setLevel: (level) => set({ level }),
      setGoal: (goal) => set({ goal }),
      setMicPermission: (micPermission) => set({ micPermission }),
      toggleSubtitleLang: (lang) =>
        set((s) => ({
          subtitleLangs: s.subtitleLangs.includes(lang)
            ? s.subtitleLangs.filter((l) => l !== lang)
            : SUBTITLE_LANGS.filter((l) => l === lang || s.subtitleLangs.includes(l)),
        })),
      setTheme: (theme) => set({ theme }),
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
      version: 3,
      migrate: (persisted, version) => migrateUserState(persisted, version) as unknown as UserState,
    },
  ),
)

// Записуємо стан одразу, щоб згенерований userId пережив перезавантаження.
useUserStore.setState((s) => ({ userId: s.userId }))
