import type { Account } from '../types/account'
import { AuthError } from './auth'

// Вхід через Google: Google Identity Services, OAuth 2.0 token flow у спливному вікні.
// Потрібен VITE_GOOGLE_CLIENT_ID (Google Cloud Console → APIs & Services → Credentials →
// OAuth client ID, тип «Web application», у «Authorized JavaScript origins» — адреси застосунку).
// Профіль (ім'я, email) читаємо з userinfo. Коли з'явиться бекенд, токен треба передавати йому
// на перевірку, а не довіряти профілю з браузера.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface TokenResponse {
  access_token?: string
  error?: string
}

interface GoogleOAuth {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: { type: string }) => void
  }): { requestAccessToken(): void }
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth } }
  }
}

let gisScript: Promise<GoogleOAuth> | null = null

function loadGis(): Promise<GoogleOAuth> {
  gisScript ??= new Promise<GoogleOAuth>((resolve, reject) => {
    const ready = () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts.oauth2) : reject(new Error('GIS missing')))
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = ready
    script.onerror = () => reject(new Error('GIS failed to load'))
    document.head.appendChild(script)
  }).catch((e: unknown) => {
    gisScript = null
    throw e
  })
  return gisScript
}

export async function signInWithGoogle(): Promise<Account> {
  if (!CLIENT_ID) {
    // Без ключа в dev даємо тестовий акаунт, щоб пройти сценарій. У продакшені — помилка.
    if (import.meta.env.DEV) return { id: 'google-dev', email: 'dev.user@gmail.com', name: 'Google Dev', provider: 'google' }
    throw new AuthError('googleUnavailable')
  }

  let oauth: GoogleOAuth
  try {
    oauth = await loadGis()
  } catch {
    throw new AuthError('googleFailed')
  }

  const token = await new Promise<string>((resolve, reject) => {
    oauth
      .initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid email profile',
        callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new AuthError('googleFailed'))),
        // Користувач закрив вікно або браузер заблокував спливне вікно.
        error_callback: (e) => reject(new AuthError(e.type === 'popup_closed' ? 'googleCancelled' : 'googleFailed')),
      })
      .requestAccessToken()
  })

  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new AuthError('googleFailed')
  const info = (await res.json()) as { sub: string; email?: string; name?: string }
  if (!info.email) throw new AuthError('googleFailed')
  return { id: `google-${info.sub}`, email: info.email, name: info.name || info.email.split('@')[0], provider: 'google' }
}
