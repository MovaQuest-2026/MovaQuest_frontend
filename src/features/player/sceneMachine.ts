// Автомат сцен уроку. Чиста логіка без React: (lesson, state, event) -> state.
import type { BranchKind, Lesson, Scene } from '../../types/lesson'

export type PlayerStatus = 'loading' | 'playing' | 'awaitingChoice' | 'listening' | 'evaluating' | 'ended'
export type InputSource = 'voice' | 'tap'
export type Outcome = NonNullable<Scene['outcome']>

export const RETURN_TARGET = '$return'

export interface HistoryEntry {
  sceneId: string
  branch?: BranchKind
  source?: InputSource
}

export interface MachineState {
  status: PlayerStatus
  currentSceneId: string
  /** Остання сцена з вибором, куди веде '$return'. */
  lastChoiceSceneId: string | null
  /** Невдалі (unclear) спроби в поточній точці вибору. */
  retryCount: number
  phrasesRevealed: boolean
  /** Фрази відкрились самі після maxRetries. */
  autoRevealed: boolean
  /**
   * Як увійшли в поточну сцену: 'play' — кліп грає з початку,
   * 'resume' — повернення через '$return', стоїмо на останньому кадрі.
   */
  entry: 'play' | 'resume'
  /** Зростає з кожним входом у сцену; UI використовує його як ключ кліпу. */
  entryId: number
  history: HistoryEntry[]
  outcome: Outcome | null
}

export type MachineEvent =
  | { type: 'CLIP_READY' }
  | { type: 'CLIP_ENDED' }
  | { type: 'REPLAY' }
  | { type: 'REVEAL_PHRASES' }
  | { type: 'HIDE_PHRASES' }
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'CANCEL_LISTENING' }
  | { type: 'RESULT'; branch: BranchKind; source: InputSource }
  | { type: 'RETRY_LIMIT' }

export function getScene(lesson: Lesson, sceneId: string): Scene {
  const scene = lesson.scenes.find((s) => s.id === sceneId)
  if (!scene) throw new Error(`Unknown scene "${sceneId}" in lesson "${lesson.id}"`)
  return scene
}

export function createInitialState(lesson: Lesson): MachineState {
  getScene(lesson, lesson.startSceneId)
  return {
    status: 'loading',
    currentSceneId: lesson.startSceneId,
    lastChoiceSceneId: null,
    retryCount: 0,
    phrasesRevealed: false,
    autoRevealed: false,
    entry: 'play',
    entryId: 0,
    history: [{ sceneId: lesson.startSceneId }],
    outcome: null,
  }
}

function enterScene(lesson: Lesson, state: MachineState, sceneId: string): MachineState {
  if (sceneId === RETURN_TARGET) {
    if (!state.lastChoiceSceneId) throw new Error('"$return" without a previous choice scene')
    // Повертаємось до тієї ж точки вибору: кліп не програється вдруге.
    return {
      ...state,
      status: 'awaitingChoice',
      currentSceneId: state.lastChoiceSceneId,
      entry: 'resume',
      entryId: state.entryId + 1,
      history: [...state.history, { sceneId: state.lastChoiceSceneId }],
    }
  }
  const scene = getScene(lesson, sceneId)
  const isNewChoicePoint = scene.choice !== undefined && sceneId !== state.lastChoiceSceneId
  return {
    ...state,
    status: 'loading',
    currentSceneId: sceneId,
    entry: 'play',
    entryId: state.entryId + 1,
    history: [...state.history, { sceneId }],
    ...(isNewChoicePoint ? { retryCount: 0, phrasesRevealed: false, autoRevealed: false } : {}),
  }
}

export function transition(lesson: Lesson, state: MachineState, event: MachineEvent): MachineState {
  if (state.status === 'ended') return state
  const scene = getScene(lesson, state.currentSceneId)
  const choice = scene.choice

  switch (event.type) {
    case 'CLIP_READY':
      return state.status === 'loading' ? { ...state, status: 'playing' } : state

    case 'REPLAY':
      // Перемотка назад у точці вибору: кліп грає знову, лічильники зберігаються.
      return state.status === 'awaitingChoice' ? { ...state, status: 'playing', entry: 'play' } : state

    case 'CLIP_ENDED': {
      if (state.status !== 'playing') return state
      if (scene.kind === 'end') return { ...state, status: 'ended', outcome: scene.outcome ?? 'partial' }
      if (choice) return { ...state, status: 'awaitingChoice', lastChoiceSceneId: scene.id }
      if (!scene.next) throw new Error(`Scene "${scene.id}" has neither choice nor next`)
      return enterScene(lesson, state, scene.next)
    }

    case 'REVEAL_PHRASES':
      return choice ? { ...state, phrasesRevealed: true } : state

    case 'HIDE_PHRASES':
      return { ...state, phrasesRevealed: false, autoRevealed: false }

    case 'RETRY_LIMIT':
      return choice ? { ...state, phrasesRevealed: true, autoRevealed: true } : state

    case 'START_LISTENING':
      return state.status === 'awaitingChoice' ? { ...state, status: 'listening' } : state

    case 'STOP_LISTENING':
      return state.status === 'listening' ? { ...state, status: 'evaluating' } : state

    case 'CANCEL_LISTENING':
      return state.status === 'listening' || state.status === 'evaluating'
        ? { ...state, status: 'awaitingChoice' }
        : state

    case 'RESULT': {
      const answerable =
        state.status === 'awaitingChoice' || state.status === 'listening' || state.status === 'evaluating'
      if (!choice || !answerable) return state

      const history = [...state.history]
      history[history.length - 1] = { ...history[history.length - 1], branch: event.branch, source: event.source }
      let next: MachineState = { ...state, history, lastChoiceSceneId: scene.id }

      if (event.branch === 'unclear') {
        const retryCount = state.retryCount + 1
        next = { ...next, retryCount }
        if (retryCount >= choice.maxRetries && !state.phrasesRevealed) {
          next = transition(lesson, next, { type: 'RETRY_LIMIT' })
        }
      }
      return enterScene(lesson, next, choice.next[event.branch])
    }
  }
}

/** Кліпи сцен, які можуть піти наступними (для передзавантаження). */
export function upcomingClips(lesson: Lesson, state: MachineState): string[] {
  if (state.status === 'ended') return []
  const scene = getScene(lesson, state.currentSceneId)
  const targets = scene.choice ? Object.values(scene.choice.next) : scene.next ? [scene.next] : []
  const clips = targets
    .map((id) => (id === RETURN_TARGET ? state.lastChoiceSceneId : id))
    .filter((id): id is string => id !== null)
    .map((id) => getScene(lesson, id).clip)
    .filter((clip) => clip !== scene.clip)
  return [...new Set(clips)]
}

/** Сцени, де користувач відповів wrong або unclear (для екрана результату). */
export function stumbles(history: HistoryEntry[]): HistoryEntry[] {
  return history.filter((h) => h.branch === 'wrong' || h.branch === 'unclear')
}

/**
 * Відновлює збережений стан незавершеного уроку. Поточна сцена грає заново,
 * а якщо користувач зупинився на виборі — знову стоїмо на останньому кадрі.
 * Повертає null, якщо знімок не підходить до уроку (урок змінився або завершений).
 */
export function restoreState(lesson: Lesson, saved: MachineState): MachineState | null {
  if (saved.status === 'ended') return null
  const ids = new Set(lesson.scenes.map((s) => s.id))
  if (!ids.has(saved.currentSceneId)) return null
  if (saved.lastChoiceSceneId && !ids.has(saved.lastChoiceSceneId)) return null
  const scene = getScene(lesson, saved.currentSceneId)
  const atChoice =
    scene.choice !== undefined &&
    (saved.status === 'awaitingChoice' || saved.status === 'listening' || saved.status === 'evaluating')
  return {
    ...saved,
    status: atChoice ? 'awaitingChoice' : 'loading',
    entry: atChoice ? 'resume' : 'play',
    entryId: saved.entryId + 1,
  }
}
