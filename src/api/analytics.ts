import type { PostHog } from 'posthog-js'
import { useUserStore } from '../store/useUserStore'
import type { Verdict } from '../lib/matchAnswer'
import type { Outcome } from '../types/lesson'

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

export function trackGapReached(lessonId: string, gapId: string) {
  capture('gap_reached', { lessonId, gapId })
}

export function trackAnswerChecked(lessonId: string, gapId: string, verdict: Verdict, input: 'voice' | 'text', attempt: number) {
  capture('answer_checked', { lessonId, gapId, verdict, input, attempt })
}

export function trackHintShown(lessonId: string, gapId: string) {
  capture('hint_shown', { lessonId, gapId })
}

export function trackGapResolved(lessonId: string, gapId: string, resolution: 'correct' | 'revealed' | 'skipped' | 'passed', attempts: number) {
  capture('gap_resolved', { lessonId, gapId, resolution, attempts })
}

export function trackMicDenied(lessonId: string, gapId: string) {
  capture('mic_denied', { lessonId, gapId })
}

export function trackLessonCompleted(lessonId: string, outcome: Outcome, correct: number, total: number) {
  capture('lesson_completed', { lessonId, outcome, correct, total })
}

export function trackLessonLiked(lessonId: string, liked: boolean) {
  capture('lesson_liked', { lessonId, liked })
}

export function trackLessonSaved(lessonId: string, saved: boolean) {
  capture('lesson_saved', { lessonId, saved })
}

export function trackCommentsOpened(lessonId: string) {
  capture('comments_opened', { lessonId })
}

export function trackCommentPosted(lessonId: string) {
  capture('comment_posted', { lessonId })
}

export function trackLessonShared(lessonId: string, method: 'native' | 'copy') {
  capture('lesson_shared', { lessonId, method })
}
