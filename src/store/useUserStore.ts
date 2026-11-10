import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang, Lesson, Scene } from '../types/lesson'

export type Level = Lesson['level']
export type Outcome = NonNullable<Scene['outcome']>
export type SubtitleMode = 'es+en' | 'es+uk' | 'es' | 'off'
export type PlaybackRate = 0.75 | 1
export type MicPermission = 'unknown' | 'granted' | 'denied' | 'skipped' | 'unsupported'

export interface CompletedLesson {
  outcome: Outcome
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

  setInterfaceLanguage: (lang: Lang) => void
  setLevel: (level: Level) => void
  setGoal: (goal: string) => void
  setMicPermission: (permission: MicPermission) => void
  setSubtitleMode: (mode: SubtitleMode) => void
  setPlaybackRate: (rate: PlaybackRate) => void
  completeOnboarding: () => void
  recordLessonResult: (lessonId: string, outcome: Outcome) => void
  resetProgress: () => void
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
      subtitleMode: 'es+en',
      playbackRate: 1,
      completedLessons: {},

      // Режим субтитрів з перекладом іде за мовою інтерфейсу.
      setInterfaceLanguage: (lang) =>
        set((s) => ({
          interfaceLanguage: lang,
          subtitleMode: s.subtitleMode === 'es+en' || s.subtitleMode === 'es+uk' ? `es+${lang}` : s.subtitleMode,
        })),
      setLevel: (level) => set({ level }),
      setGoal: (goal) => set({ goal }),
      setMicPermission: (micPermission) => set({ micPermission }),
      setSubtitleMode: (subtitleMode) => set({ subtitleMode }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      completeOnboarding: () => set({ onboardingDone: true }),
      recordLessonResult: (lessonId, outcome) =>
        set((s) => ({
          completedLessons: {
            ...s.completedLessons,
            [lessonId]: { outcome, completedAt: new Date().toISOString() },
          },
        })),
      resetProgress: () => set({ completedLessons: {} }),
    }),
    { name: 'movaquest-user-v1', version: 1 },
  ),
)

// Записуємо стан одразу, щоб згенерований userId пережив перезавантаження.
useUserStore.setState((s) => ({ userId: s.userId }))
