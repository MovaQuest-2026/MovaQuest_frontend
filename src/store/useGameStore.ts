import { create } from 'zustand'

export type NativeLanguage = 'en' | 'uk'

interface GameState {
  nativeLanguage: NativeLanguage | null
  setNativeLanguage: (lang: NativeLanguage) => void
}

export const useGameStore = create<GameState>((set) => ({
  nativeLanguage: null,
  setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
}))
