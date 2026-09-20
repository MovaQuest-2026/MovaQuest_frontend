import { create } from 'zustand'

export type NativeLanguage = 'en' | 'uk'

interface GameState {
  nativeLanguage: NativeLanguage | null
  setNativeLanguage: (lang: NativeLanguage) => void
  currentCity: string | null
  setCurrentCity: (cityId: string | null) => void
  activeDialogue: string | null
  setActiveDialogue: (dialogueId: string | null) => void
  learnedWords: string[]
  setLearnedWords: (words: string[]) => void
}

export const useGameStore = create<GameState>((set) => ({
  nativeLanguage: null,
  setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
  currentCity: null,
  setCurrentCity: (cityId) => set({ currentCity: cityId }),
  activeDialogue: null,
  setActiveDialogue: (dialogueId) => set({ activeDialogue: dialogueId }),
  learnedWords: [],
  setLearnedWords: (words) => set({ learnedWords: words }),
}))
