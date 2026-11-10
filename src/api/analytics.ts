import type { PostHog } from 'posthog-js'
import { useUserStore } from '../store/useUserStore'
import type { BranchKind } from '../types/lesson'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://us.i.posthog.com'

type EventProps = Record<string, string | number | boolean | null>

// posthog-js вантажиться окремим чанком і лише коли є ключ. Події до завантаження стоять у черзі.
let client: Promise<PostHog | null> | null = null

function getClient(): Promise<PostHog | null> {
  if (!POSTHOG_KEY) return Promise.resolve(null)
  client ??= import('posthog-js')
    .then(({ default: posthog }) => {
      // userId з useUserStore — distinct id. Пізніше його дасть anonymous sign-in.
      const { userId } = useUserStore.getState()
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        bootstrap: { distinctID: userId },
        person_profiles: 'identified_only',
      })
      posthog.identify(userId)
      return posthog
    })
    .catch(() => null)
  return client
}

// Усі події йдуть тільки через функції нижче: ідентифікатори, без текстів і аудіо.
function capture(event: string, properties: EventProps = {}) {
  if (!POSTHOG_KEY) return
  const { interfaceLanguage, level } = useUserStore.getState()
  const props = { interfaceLanguage, userLevel: level, ...properties }
  void getClient().then((posthog) => posthog?.capture(event, props))
}

export function trackLessonStarted(lessonId: string) {
  capture('lesson_started', { lessonId })
}

export function trackSceneStarted(lessonId: string, sceneId: string) {
  capture('scene_started', { lessonId, sceneId })
}

export function trackPhrasesRevealed(lessonId: string, sceneId: string, auto: boolean) {
  capture('phrases_revealed', { lessonId, sceneId, auto })
}

export function trackChoiceMade(lessonId: string, sceneId: string, branch: BranchKind, input: 'voice' | 'tap') {
  capture('choice_made', { lessonId, sceneId, branch, input })
}

export function trackRetry(lessonId: string, sceneId: string, count: number) {
  capture('retry', { lessonId, sceneId, count })
}

export function trackMicDenied(lessonId: string, sceneId: string) {
  capture('mic_denied', { lessonId, sceneId })
}

export function trackLessonCompleted(lessonId: string, outcome: 'perfect' | 'partial' | 'missed') {
  capture('lesson_completed', { lessonId, outcome })
}
