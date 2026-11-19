import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account } from '../types/account'
import type { MachineState } from '../features/player/gapMachine'
import type { Lang, Lesson, Outcome, SubtitleLang } from '../types/lesson'
import type { ActiveLesson, CompletedLesson, Progress } from '../types/progress'

export type Level = Lesson['level']
export type { Outcome }
export type { SubtitleLang }
export type { ActiveLesson, CompletedLesson, Progress }
/** Порядок рядків субтитрів: спершу оригінал, далі переклади. */
export const SUBTITLE_LANGS: SubtitleLang[] = ['es', 'en', 'uk']
/** system: як у налаштуваннях пристрою (prefers-color-scheme). */
export type ThemePreference = 'system' | 'light' | 'dark'
/** Швидкість відео: поділки повзунка в профілі й у плеєрі. */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]
export type MicPermission = 'unknown' | 'granted' | 'denied' | 'skipped' | 'unsupported'

/**
 * Прогрес одного акаунта на цьому пристрої: офлайн-кеш серверного (/me/progress), щоб після входу
 * профіль одразу показував числа, а useProgressSync їх уточнював.
 */
export type AccountProgress = Progress

interface UserState {
  userId: string
  /** Поточний обліковий запис. null: користувач не ввійшов, сторінки застосунку ведуть на /auth. */
  account: Account | null
  /** Акаунт є, а онбординг не завершено (немає профілю): сторінки застосунку ведуть на /onboarding. */
  onboardingPending: boolean
  /** Користувач закрив підказку «Увійдіть» над відео: більше її не показуємо. */
  signInPromptDismissed: boolean
  interfaceLanguage: Lang
  level: Level
  goal: string
  onboardingDone: boolean
  micPermission: MicPermission
  /** Які мови субтитрів показувати. Порожній список: субтитри вимкнено. */
  subtitleLangs: SubtitleLang[]
  theme: ThemePreference
  playbackRate: PlaybackRate
  /** Прогрес поточного акаунта. Гість прогресу не має: він порожній і не оновлюється. */
  completedLessons: Record<string, CompletedLesson>
  learnedWords: Record<string, string[]>
  /** Збережений прогрес акаунтів, з яких вийшли (повертається після входу). */
  progressByAccount: Record<string, AccountProgress>
  /**
   * Незавершені уроки поточного акаунта (або гостя): стан проходження кожного, щоб повернувшись до відео,
   * продовжити з того ж місця. Належать акаунту, як і решта прогресу; гостьові переходять в акаунт після входу.
   */
  activeLessons: Record<string, ActiveLesson>
  /** Уподобані уроки (серце в стрічці). */
  likedLessons: string[]
  /** Збережені уроки (закладка в стрічці). */
  savedLessons: string[]

  setAccount: (account: Account | null) => void
  dismissSignInPrompt: () => void
  setOnboardingPending: (pending: boolean) => void
  setInterfaceLanguage: (lang: Lang) => void
  setLevel: (level: Level) => void
  setGoal: (goal: string) => void
  setMicPermission: (permission: MicPermission) => void
  toggleSubtitleLang: (lang: SubtitleLang) => void
  setTheme: (theme: ThemePreference) => void
  setPlaybackRate: (rate: PlaybackRate) => void
  completeOnboarding: () => void
  recordLessonResult: (lessonId: string, outcome: Outcome, correct: number, total: number) => void
  /** Слово (пауза) вивчене: на нього відповіли правильно. Лише для акаунта. */
  recordWordLearned: (lessonId: string, gapId: string) => void
  resetProgress: () => void
  /** Замінює прогрес акаунта (результат синхронізації з бекендом). */
  setProgress: (progress: Progress) => void
  /** Зберігає стан незавершеного уроку; null видаляє (урок завершено або скинуто). */
  setActiveLesson: (lessonId: string, machine: MachineState | null) => void
  toggleLiked: (lessonId: string) => void
  toggleSaved: (lessonId: string) => void
  /** Замінює списки лайків і збережених (синхронізація з бекендом після входу). */
  setReactions: (liked: string[], saved: string[]) => void
}

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
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
 * v4: лайки й збереження уроків.
 * v5: обліковий запис (спершу порожній).
 * v6: вхід необов'язковий, його можна пропустити (authSkipped).
 * v7: замість authSkipped підказка над відео, яку можна закрити (signInPromptDismissed).
 * v8: onboardingPending (уточнюється з профілю акаунта під час запуску, див. useOnboardingCheck).
 * v10: activeLessons — незавершений стан кожного уроку, а не лише останнього (activeLesson).
 * v9: прогрес лише в акаунта (learnedWords, progressByAccount); гостьовий прогрес відкидається.
 * v11: знімок незавершеного уроку має час (`{ machine, updatedAt }`), activeLessons стали частиною прогресу акаунта.
 */
export function migrateUserState(persisted: unknown, version: number): Record<string, unknown> {
  let state = { ...(persisted as Record<string, unknown>) }
  if (version < 2) state = { ...state, completedLessons: {}, activeLesson: null }
  if (version < 3) {
    const { subtitleMode, ...rest } = state
    const subtitleLangs: SubtitleLang[] = subtitleMode === 'off' ? [] : ['es']
    state = { ...rest, subtitleLangs, theme: 'system' }
  }
  if (version < 4) state = { ...state, likedLessons: [], savedLessons: [] }
  if (version < 5) state = { ...state, account: null }
  if (version < 6) state = { ...state, authSkipped: false }
  if (version < 7) {
    const { authSkipped: _skipped, ...rest } = state
    state = { ...rest, signInPromptDismissed: false }
  }
  if (version < 8) state = { ...state, onboardingPending: false }
  if (version < 9) {
    state = { ...state, learnedWords: {}, progressByAccount: {} }
    if (!state.account) state = { ...state, completedLessons: {} }
  }
  if (version < 10) {
    const { activeLesson, ...rest } = state as { activeLesson?: { lessonId?: string; machine?: unknown } | null }
    const old = activeLesson?.lessonId && activeLesson.machine ? { [activeLesson.lessonId]: activeLesson.machine } : {}
    state = { ...rest, activeLessons: old }
  }
  if (version < 11) {
    const updatedAt = new Date().toISOString()
    const active = (state.activeLessons ?? {}) as Record<string, unknown>
    const byAccount = (state.progressByAccount ?? {}) as Record<string, Record<string, unknown>>
    state = {
      ...state,
      activeLessons: Object.fromEntries(Object.entries(active).map(([id, machine]) => [id, { machine, updatedAt }])),
      progressByAccount: Object.fromEntries(
        Object.entries(byAccount).map(([id, p]) => [id, { ...p, activeLessons: {} }]),
      ),
    }
  }
  return state
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: createUserId(),
      account: null,
      signInPromptDismissed: false,
      onboardingPending: false,
      interfaceLanguage: 'en',
      level: 'A2',
      goal: '',
      onboardingDone: false,
      micPermission: 'unknown',
      subtitleLangs: ['es'],
      theme: 'system',
      playbackRate: 1,
      completedLessons: {},
      learnedWords: {},
      progressByAccount: {},
      activeLessons: {},
      likedLessons: [],
      savedLessons: [],

      // Прогрес належить акаунту: при виході зберігаємо його, при вході повертаємо; гість починає з порожнього.
      // Незавершені уроки гостя після входу переходять в акаунт (якщо в нього цього уроку ще немає).
      setAccount: (account) =>
        set((s) => {
          const prevId = s.account?.id ?? null
          const nextId = account?.id ?? null
          if (prevId === nextId) return { account }
          const progressByAccount = prevId
            ? {
                ...s.progressByAccount,
                [prevId]: { completedLessons: s.completedLessons, learnedWords: s.learnedWords, activeLessons: s.activeLessons },
              }
            : s.progressByAccount
          const restored = nextId ? progressByAccount[nextId] : undefined
          const guestActive = prevId === null ? s.activeLessons : {}
          return {
            account,
            progressByAccount,
            completedLessons: restored?.completedLessons ?? {},
            learnedWords: restored?.learnedWords ?? {},
            activeLessons: nextId ? { ...guestActive, ...(restored?.activeLessons ?? {}) } : {},
          }
        }),
      dismissSignInPrompt: () => set({ signInPromptDismissed: true }),
      setOnboardingPending: (onboardingPending) => set({ onboardingPending }),
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
        set((s) =>
          // Гість прогресу не має; гірше повторне проходження не затирає кращий результат.
          s.account === null || (s.completedLessons[lessonId] && s.completedLessons[lessonId].correct > correct)
            ? s
            : {
                completedLessons: {
                  ...s.completedLessons,
                  [lessonId]: { outcome, correct, total, completedAt: new Date().toISOString() },
                },
              },
        ),
      recordWordLearned: (lessonId, gapId) =>
        set((s) => {
          if (s.account === null || s.learnedWords[lessonId]?.includes(gapId)) return s
          return { learnedWords: { ...s.learnedWords, [lessonId]: [...(s.learnedWords[lessonId] ?? []), gapId] } }
        }),
      resetProgress: () => set({ completedLessons: {}, learnedWords: {}, activeLessons: {} }),
      setProgress: ({ completedLessons, learnedWords, activeLessons }) => set({ completedLessons, learnedWords, activeLessons }),
      setActiveLesson: (lessonId, machine) =>
        set((s) => {
          if (machine === null) {
            if (!(lessonId in s.activeLessons)) return s
            const { [lessonId]: _removed, ...rest } = s.activeLessons
            return { activeLessons: rest }
          }
          return { activeLessons: { ...s.activeLessons, [lessonId]: { machine, updatedAt: new Date().toISOString() } } }
        }),
      toggleLiked: (lessonId) => set((s) => ({ likedLessons: toggleIn(s.likedLessons, lessonId) })),
      toggleSaved: (lessonId) => set((s) => ({ savedLessons: toggleIn(s.savedLessons, lessonId) })),
      setReactions: (likedLessons, savedLessons) => set({ likedLessons, savedLessons }),
    }),
    {
      name: 'movaquest-user-v1',
      version: 11,
      migrate: (persisted, version) => migrateUserState(persisted, version) as unknown as UserState,
    },
  ),
)

// Записуємо стан одразу, щоб згенерований userId пережив перезавантаження.
useUserStore.setState((s) => ({ userId: s.userId }))
