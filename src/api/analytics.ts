import posthog from 'posthog-js'
import { useGameStore } from '../store/useGameStore'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://us.i.posthog.com'

let initialized = false

function ensureInitialized(): boolean {
  if (!POSTHOG_KEY) return false
  if (!initialized) {
    posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST })
    initialized = true
  }
  return true
}

// Кожна подія несе місто і мову інтерфейсу. Тільки ідентифікатори — жодних ink-текстів.
function capture(event: string, properties: Record<string, string | number | boolean | null>) {
  if (!ensureInitialized()) return
  const { currentCity, nativeLanguage } = useGameStore.getState()
  posthog.capture(event, { cityId: currentCity, nativeLanguage, ...properties })
}

export function trackLessonStarted(dialogueId: string) {
  capture('lesson_started', { dialogueId })
}

export function trackLessonCompleted(dialogueId: string, score: number) {
  capture('lesson_completed', { dialogueId, score })
}

export function trackExerciseAnswered(questionId: string, correct: boolean) {
  capture('exercise_answered', { questionId, correct })
}

export function trackZoneEntered(zoneId: string, gameClock: string) {
  capture('zone_entered', { zoneId, gameClock })
}

export function trackDoorEntered(doorId: string, zoneId: string) {
  capture('door_entered', { doorId, zoneId })
}

export function trackQuestStepCompleted(stepId: string, msSinceStart: number | null) {
  capture('quest_step_completed', { stepId, msSinceStart })
}

export function trackQuizAnswered(quizId: string, correct: boolean) {
  capture('quiz_answered', { quizId, correct })
}

export function trackDialogueFinished(dialogueId: string) {
  capture('dialogue_finished', { dialogueId })
}

export function trackEndingReached(ending: string, trust: number) {
  capture('ending_reached', { ending, trust })
}

export function trackSessionResumed(zoneId: string | null, questStep: string | null) {
  capture('session_resumed', { zoneId, questStep })
}

export function trackTravelConfirmed(
  fromZone: string,
  toZone: string,
  stationsDone: number,
  alphaScore: number,
) {
  capture('travel_confirmed', { fromZone, toZone, stationsDone, alphaScore })
}

export function trackTravelCancelled(fromZone: string, stationsDone: number) {
  capture('travel_cancelled', { fromZone, stationsDone })
}
