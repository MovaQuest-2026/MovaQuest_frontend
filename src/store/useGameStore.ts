import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type NativeLanguage = 'en' | 'uk'

export type FlagValue = boolean | number | string

export interface SpawnPoint {
  x: number
  y: number
}

export interface InteractionHint {
  kind: 'npc' | 'door' | 'exit'
  id: string
  label: { en: string; uk: string }
}

interface GameData {
  nativeLanguage: NativeLanguage | null
  currentCity: string | null
  activeDialogue: string | null
  activeExercise: string | null
  learnedWords: string[]
  flags: Record<string, FlagValue>
  questStep: string | null
  gameClock: string
  currentZone: string | null
  spawn: SpawnPoint | null
  inventory: string[]
  interactionHint: InteractionHint | null
  interactRequest: number
}

interface GameActions {
  setNativeLanguage: (lang: NativeLanguage) => void
  setCurrentCity: (cityId: string | null) => void
  setActiveDialogue: (dialogueId: string | null) => void
  setActiveExercise: (dialogueId: string | null) => void
  setLearnedWords: (words: string[]) => void
  addLearnedWord: (word: string) => void
  setFlag: (name: string, value: FlagValue) => void
  setFlags: (partial: Record<string, FlagValue>) => void
  setQuestStep: (stepId: string | null) => void
  setGameClock: (clock: string) => void
  setCurrentZone: (zoneId: string | null) => void
  setSpawn: (spawn: SpawnPoint | null) => void
  addItem: (item: string) => void
  removeItem: (item: string) => void
  setInteractionHint: (hint: InteractionHint | null) => void
  requestInteract: () => void
  resetProgress: () => void
}

type GameState = GameData & GameActions

const SAVE_KEY = 'movaquest-save-v1'

const initialData: GameData = {
  nativeLanguage: null,
  currentCity: null,
  activeDialogue: null,
  activeExercise: null,
  learnedWords: [],
  flags: {},
  questStep: null,
  gameClock: '09:00',
  currentZone: null,
  spawn: null,
  inventory: [],
  interactionHint: null,
  interactRequest: 0,
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...initialData,
      setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
      setCurrentCity: (cityId) => set({ currentCity: cityId }),
      setActiveDialogue: (dialogueId) => set({ activeDialogue: dialogueId }),
      setActiveExercise: (dialogueId) => set({ activeExercise: dialogueId }),
      setLearnedWords: (words) => set({ learnedWords: words }),
      addLearnedWord: (word) =>
        set((state) =>
          state.learnedWords.includes(word)
            ? state
            : { learnedWords: [...state.learnedWords, word] },
        ),
      setFlag: (name, value) =>
        set((state) => ({ flags: { ...state.flags, [name]: value } })),
      setFlags: (partial) =>
        set((state) => ({ flags: { ...state.flags, ...partial } })),
      setQuestStep: (stepId) => set({ questStep: stepId }),
      setGameClock: (clock) => set({ gameClock: clock }),
      setCurrentZone: (zoneId) => set({ currentZone: zoneId }),
      setSpawn: (spawn) => set({ spawn }),
      addItem: (item) =>
        set((state) =>
          state.inventory.includes(item)
            ? state
            : { inventory: [...state.inventory, item] },
        ),
      removeItem: (item) =>
        set((state) => ({
          inventory: state.inventory.filter((existing) => existing !== item),
        })),
      setInteractionHint: (hint) => set({ interactionHint: hint }),
      requestInteract: () =>
        set((state) => ({ interactRequest: state.interactRequest + 1 })),
      resetProgress: () => {
        set(initialData)
        useGameStore.persist.clearStorage()
      },
    }),
    {
      name: SAVE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nativeLanguage: state.nativeLanguage,
        currentCity: state.currentCity,
        flags: state.flags,
        questStep: state.questStep,
        gameClock: state.gameClock,
        currentZone: state.currentZone,
        spawn: state.spawn,
        inventory: state.inventory,
        learnedWords: state.learnedWords,
      }),
    },
  ),
)
