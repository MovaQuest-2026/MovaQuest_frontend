import type { PostHog } from 'posthog-js'
import { useUserStore } from '../store/useUserStore'
import type { Verdict } from '../lib/matchAnswer'
import type { Outcome } from '../types/lesson'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
// Google Analytics 4: Measurement ID виду G-XXXXXXXXXX. Без нього gtag.js не вантажиться.
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
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

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

// gtag.js вставляється скриптом лише коли є Measurement ID. До завантаження події лежать у dataLayer.
// Перегляди сторінок SPA рахує сам GA4 (Enhanced measurement → «Page changes based on browser history events»).
let gtagReady = false

function getGtag(): Gtag | null {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return null
  if (!gtagReady) {
    gtagReady = true
    window.dataLayer = window.dataLayer ?? []
    window.gtag = function gtag() {
      // gtag.js чекає саме об'єкт arguments, а не масив.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID)
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`
    document.head.appendChild(script)
  }
  return window.gtag ?? null
}

// Вмикає GA4 під час запуску, щоб перегляди сторінок рахувались і без подій уроку.
export function initAnalytics() {
  getGtag()
}

// Усі події йдуть тільки через функції нижче: ідентифікатори, без текстів і аудіо.
function capture(event: string, properties: EventProps = {}) {
  if (!POSTHOG_KEY && !GA_MEASUREMENT_ID) return
  const { interfaceLanguage, level } = useUserStore.getState()
  const props = { interfaceLanguage, userLevel: level, ...properties }
  getGtag()?.('event', event, props)
  if (POSTHOG_KEY) void getClient().then((posthog) => posthog?.capture(event, props))
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
