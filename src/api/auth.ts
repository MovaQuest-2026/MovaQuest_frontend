import { useUserStore } from '../store/useUserStore'
import type { Account } from '../types/account'
import { ApiError, apiFetch, NetworkError } from './http'

export interface AnonymousUser {
  userId: string
  isAnonymous: true
}

// Гість: локальний id з useUserStore (distinct id для PostHog). Бекенд гостей не знає.
export async function getAnonymousUser(): Promise<AnonymousUser> {
  return { userId: useUserStore.getState().userId, isAnonymous: true }
}

export type { Account }

export type AuthErrorCode =
  | 'nameRequired'
  | 'invalidEmail'
  | 'weakPassword'
  | 'signUpRejected'
  | 'signUpLoginFailed'
  | 'wrongCredentials'
  | 'tooManyAttempts'
  | 'serverUnavailable'
  | 'googleFailed'
  | 'googleCancelled'
  | 'accountInactive'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode) {
    super(code)
    this.code = code
  }
}

/** Мінімум бекенду (PASSWORD_MIN_LENGTH на Render). */
export const PASSWORD_MIN_LENGTH = 8
const NAME_MIN = 2
const NAME_MAX = 30
const EMAIL_MAX = 50

// ---------- Бекенд: /api/v1/users, /api/v1/auth ----------

/** UserRead з бекенду (GET /users/me). */
interface UserRead {
  id: number
  name: string
  username: string
  email: string
  oauth_provider?: string | null
}

export const toAccount = (u: UserRead): Account => ({
  id: String(u.id),
  email: u.email,
  name: u.name || u.username,
  provider: u.oauth_provider === 'google' ? 'google' : 'password',
})

const normalizeEmail = (email: string) => email.trim().toLowerCase()
const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= EMAIL_MAX

/** Мережеві збої й «сервер прокидається» — окремий код, решту віддаємо як є. */
function rethrow(err: unknown, map: (e: ApiError) => AuthErrorCode): never {
  if (err instanceof AuthError) throw err
  if (err instanceof NetworkError) throw new AuthError('serverUnavailable')
  if (err instanceof ApiError) {
    if (err.status === 429) throw new AuthError('tooManyAttempts')
    if (err.status >= 500) throw new AuthError('serverUnavailable')
    throw new AuthError(map(err))
  }
  throw err
}

/**
 * Поточний акаунт за cookie сесії: Account або null (гість, сесія закінчилась).
 * NetworkError прокидається далі: тоді не знаємо, чи сесія жива, і нічого не міняємо.
 */
export async function getCurrentAccount(): Promise<Account | null> {
  try {
    return toAccount(await apiFetch<UserRead>('/users/me'))
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null
    throw err
  }
}

/**
 * username бекенд поки вимагає (^[a-z0-9_]+$, 2–32, унікальний). Користувач його не бачить,
 * тож генеруємо з email: olena.k@… → olena_k_4821. Коли бекенд генеруватиме його сам, поле можна прибрати.
 */
export function usernameFromEmail(email: string): string {
  const base =
    email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24) || 'user'
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${base}_${suffix}`
}

export async function signUp(input: { name: string; email: string; password: string }): Promise<Account> {
  const name = input.name.trim().slice(0, NAME_MAX)
  const email = normalizeEmail(input.email)
  if (name.length < NAME_MIN) throw new AuthError('nameRequired')
  if (!isEmail(email)) throw new AuthError('invalidEmail')
  if (input.password.length < PASSWORD_MIN_LENGTH) throw new AuthError('weakPassword')

  // 409 — зайнятий username (випадковий суфікс збігся): пробуємо інший.
  for (let attempt = 0; ; attempt++) {
    try {
      await apiFetch('/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username: usernameFromEmail(email), password: input.password }),
      })
      break
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && attempt < 2) continue
      // 422 на проді приходить без переліку полів: email і довжину ми вже перевірили,
      // тож найімовірніше пароль не пройшов політику бекенду (великі/малі літери, цифра, символ).
      rethrow(err, () => 'signUpRejected')
    }
  }

  // Реєстрація не входить в акаунт. Бекенд однаково відповідає й на вже зайнятий email,
  // тож якщо вхід не вдався, найімовірніше акаунт з цим email уже є.
  try {
    return await signIn({ email, password: input.password })
  } catch (err) {
    if (err instanceof AuthError && err.code === 'wrongCredentials') throw new AuthError('signUpLoginFailed')
    throw err
  }
}

export async function signIn(input: { email: string; password: string }): Promise<Account> {
  const email = normalizeEmail(input.email)
  if (!isEmail(email)) throw new AuthError('invalidEmail')
  try {
    await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password: input.password, remember_me: 'true' }).toString(),
    })
    const account = await getCurrentAccount()
    if (!account) throw new AuthError('wrongCredentials')
    return account
  } catch (err) {
    // 401 — неправильні дані (однаково для «немає такого email»), 403 — блокування після невдалих спроб або вимкнений акаунт.
    rethrow(err, (e) => (e.status === 403 && !/cross-site/i.test(e.detail ?? '') ? 'tooManyAttempts' : 'wrongCredentials'))
  }
}

/** Вихід на сервері. Локальну сесію (account у useUserStore) прибирає той, хто викликає. */
export async function signOut(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // Сесія вже закінчилась або немає зв'язку: локально однаково виходимо.
  }
}
