import { AuthError, type AuthErrorCode } from './auth'
import { API_BASE } from './http'

// Вхід через Google: redirect-flow на бекенді (OAuth 2.0 code + PKCE).
// 1. Браузер іде на /api/v1/auth/oauth/google?redirect_to=/auth/callback (той самий домен, через проксі).
// 2. Бекенд ставить cookie зі state і перенаправляє на Google, Google повертає на
//    <OAUTH_REDIRECT_BASE_URL>/api/v1/auth/oauth/callback/google.
// 3. Бекенд створює сесію (cookie session_id) і перенаправляє на /auth/callback; при помилці — на корінь з ?error=<код>.
// Щоб це працювало, OAUTH_REDIRECT_BASE_URL на Render має бути адресою фронту, а не Render (docs/backend-plan.md §2.3).
// Client ID і secret живуть лише на бекенді.

export const OAUTH_CALLBACK_PATH = '/auth/callback'
const PENDING_KEY = 'movaquest-oauth-pending'

interface PendingOAuth {
  /** Куди повернутися після входу. */
  returnTo: string
  startedAt: number
}

/** Перехід на Google. Сторінка йде геть, тож Promise не завершується. */
export function startGoogleSignIn(returnTo: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ returnTo, startedAt: Date.now() } satisfies PendingOAuth))
  } catch {
    // Без sessionStorage після входу просто підемо на /app.
  }
  window.location.assign(`${API_BASE}/auth/oauth/google?redirect_to=${encodeURIComponent(OAUTH_CALLBACK_PATH)}`)
}

/** Чи ми саме повертаємось із Google (вхід почали в цій вкладці не більше ніж 30 хв тому). Знімає позначку. */
export function takePendingGoogleSignIn(): PendingOAuth | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    if (!raw) return null
    const pending = JSON.parse(raw) as PendingOAuth
    return Date.now() - pending.startedAt < 30 * 60_000 ? pending : null
  } catch {
    return null
  }
}

/** Код помилки з ?error= після callback → наш код помилки. */
export function googleErrorFromQuery(error: string): AuthError {
  // Бекенд зводить відмову користувача в Google до oauth_failed; access_denied — якщо колись передаватиме код Google як є.
  const code: AuthErrorCode = error === 'access_denied' ? 'googleCancelled' : error === 'account_inactive' ? 'accountInactive' : 'googleFailed'
  return new AuthError(code)
}
