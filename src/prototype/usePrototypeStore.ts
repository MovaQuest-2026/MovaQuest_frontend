import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HistoryEntry, Level } from './data'

export const MAX_HEARTS = 3

type PrototypeState = {
  name: string
  uiLanguage: 'en' | 'uk'
  level: Level
  hearts: number
  learned: string[]
  history: HistoryEntry[]
  setName: (name: string) => void
  setUiLanguage: (uiLanguage: 'en' | 'uk') => void
  setLevel: (level: Level) => void
  spendHeart: () => void
  refillHearts: () => void
  markLearned: (id: string) => void
  addHistory: (scenarioId: string) => string
  reset: () => void
}

const initialState = {
  name: 'Alex',
  uiLanguage: 'en' as const,
  level: 'A0' as Level,
  hearts: MAX_HEARTS,
  learned: [] as string[],
  history: [] as HistoryEntry[],
}

export const usePrototypeStore = create<PrototypeState>()(
  persist(
    (set) => ({
      ...initialState,
      setName: (name) => set({ name }),
      setUiLanguage: (uiLanguage) => set({ uiLanguage }),
      setLevel: (level) => set({ level }),
      spendHeart: () => set((state) => ({ hearts: Math.max(0, state.hearts - 1) })),
      refillHearts: () => set({ hearts: MAX_HEARTS }),
      markLearned: (id) => set((state) => (state.learned.includes(id) ? state : { learned: [...state.learned, id] })),
      addHistory: (scenarioId) => {
        const id = `${scenarioId}-${Date.now()}`
        set((state) => ({ history: [{ id, scenarioId, finishedAt: new Date().toISOString() }, ...state.history] }))
        return id
      },
      reset: () => set(initialState),
    }),
    { name: 'movaquest-prototype-v2' },
  ),
)
