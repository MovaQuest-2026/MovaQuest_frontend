import posthog from 'posthog-js'

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

export function trackLessonStarted(dialogueId: string) {
  if (!ensureInitialized()) return
  posthog.capture('lesson_started', { dialogueId })
}

export function trackLessonCompleted(dialogueId: string, score: number) {
  if (!ensureInitialized()) return
  posthog.capture('lesson_completed', { dialogueId, score })
}

export function trackExerciseAnswered(questionId: string, correct: boolean) {
  if (!ensureInitialized()) return
  posthog.capture('exercise_answered', { questionId, correct })
}
