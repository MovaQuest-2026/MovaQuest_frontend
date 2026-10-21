import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CityConfig } from '../api/getCityConfig'
import type { Questline } from '../api/getQuestline'

export type NativeLanguage = 'en' | 'uk'

export type FlagValue = boolean | number | string

export interface SpawnPoint {
  x: number
  y: number
}

// locked — не дія, а пояснення, чому прохід закритий (label — сам текст).
export interface InteractionHint {
  kind: 'npc' | 'door' | 'exit' | 'locked'
  id: string
  label: { en: string; uk: string }
}

export interface FinishedDialogueEvent {
  dialogueId: string
  seq: number
}

export interface DoorEnteredEvent {
  doorId: string
  zoneId: string
  seq: number
}

export interface ZoneRequest {
  zoneId: string
  seq: number
}

// Вихід з вікном підтвердження: сцена зупинила гравця і чекає відповіді React.
export interface PendingExit {
  zoneId: string
  exitId: string
}

// Рішення гравця у вікні підтвердження; сцена за seq відрізняє нове рішення від старого.
export interface ExitDecisionEvent extends PendingExit {
  confirmed: boolean
  seq: number
}

// Вектор віртуального джойстика, кожна вісь у діапазоні −1..1.
export interface JoystickVector {
  x: number
  y: number
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
  cityConfig: CityConfig | null
  questline: Questline | null
  lastFinishedDialogue: FinishedDialogueEvent | null
  pendingCutscene: string | null
  pendingEnding: string | null
  // Стан ink для діалогів з keepState, ключ — `${dialogueId}:${lang}`.
  inkStates: Record<string, string>
  // Момент старту квесту (Date.now()), для msSinceStart в аналітиці.
  startedAt: number | null
  lastDoorEntered: DoorEnteredEvent | null
  zoneRequest: ZoneRequest | null
  pendingExit: PendingExit | null
  lastExitDecision: ExitDecisionEvent | null
  // Тільки для DebugPanel: малювати physics debug, щоб підігнати colliders.
  debugPhysics: boolean
  joystick: JoystickVector
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
  setWorldData: (cityConfig: CityConfig, questline: Questline) => void
  finishDialogue: (dialogueId: string) => void
  setPendingCutscene: (cutsceneId: string | null) => void
  setPendingEnding: (endingId: string | null) => void
  setInkState: (key: string, json: string) => void
  finishGame: (ending: string) => void
  markDoorEntered: (doorId: string, zoneId: string) => void
  requestZone: (zoneId: string) => void
  setPendingExit: (pending: PendingExit | null) => void
  confirmPendingExit: () => void
  cancelPendingExit: () => void
  setDebugPhysics: (enabled: boolean) => void
  setJoystick: (vector: JoystickVector) => void
  startLevel: (cityId: string) => void
  resetProgress: () => void
}

type GameState = GameData & GameActions

// v1 — збереження до пролога на галявині: вони відновлювали гравця в зонах без арту (квадрати-плейсхолдери)
// з квестовим станом, несумісним з поточним квестом. Їх не мігруємо, а прибираємо.
const SAVE_KEY = 'movaquest-save-v2'
const LEGACY_SAVE_KEYS = ['movaquest-save-v1']

function removeLegacySaves() {
  try {
    for (const key of LEGACY_SAVE_KEYS) localStorage.removeItem(key)
  } catch {
    // localStorage недоступний (приватний режим) — persist теж не працюватиме.
  }
}

removeLegacySaves()

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
  cityConfig: null,
  questline: null,
  lastFinishedDialogue: null,
  pendingCutscene: null,
  pendingEnding: null,
  inkStates: {},
  startedAt: null,
  lastDoorEntered: null,
  zoneRequest: null,
  pendingExit: null,
  lastExitDecision: null,
  debugPhysics: false,
  joystick: { x: 0, y: 0 },
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
      setWorldData: (cityConfig, questline) => set({ cityConfig, questline }),
      finishDialogue: (dialogueId) =>
        set((state) => ({
          lastFinishedDialogue: {
            dialogueId,
            seq: (state.lastFinishedDialogue?.seq ?? 0) + 1,
          },
        })),
      setPendingCutscene: (cutsceneId) => set({ pendingCutscene: cutsceneId }),
      setPendingEnding: (endingId) => set({ pendingEnding: endingId }),
      setInkState: (key, json) =>
        set((state) => ({ inkStates: { ...state.inkStates, [key]: json } })),
      // Кінцівка зберігається у flags, тож після F5 гра показує щоденник, а не фінальний діалог.
      finishGame: (ending) =>
        set((state) => ({
          flags: { ...state.flags, game_finished: true, ending },
          pendingEnding: null,
          pendingCutscene: null,
        })),
      markDoorEntered: (doorId, zoneId) =>
        set((state) => ({
          lastDoorEntered: {
            doorId,
            zoneId,
            seq: (state.lastDoorEntered?.seq ?? 0) + 1,
          },
        })),
      requestZone: (zoneId) =>
        set((state) => ({
          zoneRequest: { zoneId, seq: (state.zoneRequest?.seq ?? 0) + 1 },
        })),
      setPendingExit: (pending) => set({ pendingExit: pending }),
      // Прапорець і час ставимо тут, сам перехід робить сцена за lastExitDecision.
      confirmPendingExit: () =>
        set((state) => {
          const pending = state.pendingExit
          if (!pending) return state
          const exit = state.cityConfig?.zones
            .find((zone) => zone.id === pending.zoneId)
            ?.exits.find((candidate) => candidate.id === pending.exitId)
          return {
            pendingExit: null,
            flags: exit?.setFlagOnConfirm
              ? { ...state.flags, [exit.setFlagOnConfirm]: true }
              : state.flags,
            gameClock: exit?.setClockOnConfirm ?? state.gameClock,
            lastExitDecision: {
              ...pending,
              confirmed: true,
              seq: (state.lastExitDecision?.seq ?? 0) + 1,
            },
          }
        }),
      cancelPendingExit: () =>
        set((state) =>
          state.pendingExit
            ? {
                pendingExit: null,
                lastExitDecision: {
                  ...state.pendingExit,
                  confirmed: false,
                  seq: (state.lastExitDecision?.seq ?? 0) + 1,
                },
              }
            : state,
        ),
      setDebugPhysics: (enabled) => set({ debugPhysics: enabled }),
      setJoystick: (vector) => set({ joystick: vector }),
      // Новий рівень: прогрес рівня скидається, мова інтерфейсу і вивчені слова лишаються.
      startLevel: (cityId) => {
        set((state) => ({
          ...initialData,
          nativeLanguage: state.nativeLanguage,
          learnedWords: state.learnedWords,
          currentCity: cityId,
        }))
      },
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
        // Кат-сцена і кінцівка переживають F5 посеред кат-сцени.
        pendingCutscene: state.pendingCutscene,
        pendingEnding: state.pendingEnding,
        inkStates: state.inkStates,
        startedAt: state.startedAt,
      }),
    },
  ),
)
