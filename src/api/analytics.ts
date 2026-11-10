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

type EventProps = Record<string, string | number | boolean | null>

// Усі події йдуть через цей модуль. Тільки ідентифікатори, без текстів і аудіо.
export function capture(event: string, properties: EventProps = {}) {
  if (!ensureInitialized()) return
  posthog.capture(event, properties)
}

export function identify(userId: string) {
  if (!ensureInitialized()) return
  posthog.identify(userId)
}
