// HTTP-клієнт бекенду (FastAPI на Render, усе під /api/v1).
// Браузер ходить на той самий домен, що й застосунок: на Vercel /api/* проксіює vercel.json,
// локально — server.proxy у vite.config.ts. Тому cookie сесії свої (first-party), CORS не потрібен,
// а перевірка Sec-Fetch-Site у бекенді бачить same-origin. Деталі: docs/backend-plan.md §2.1.

export const API_BASE = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  /** `detail` з тіла відповіді FastAPI, якщо він рядок. */
  readonly detail: string | null
  constructor(status: number, detail: string | null) {
    super(detail ?? `HTTP ${status}`)
    this.status = status
    this.detail = detail
  }
}

/** Мережа недоступна або сервер не відповів (Render прокидається, 502/503/504). */
export class NetworkError extends Error {}

const CSRF_COOKIE = 'csrf_token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null
}

async function readDetail(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { detail?: unknown }
    return typeof body.detail === 'string' ? body.detail : null
  } catch {
    return null
  }
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  // Змінні запити в сесії бекенд пропускає лише з X-CSRF-Token, рівним cookie csrf_token.
  if (!SAFE_METHODS.has(method)) {
    const csrf = readCookie(CSRF_COOKIE)
    if (csrf) headers.set('X-CSRF-Token', csrf)
  }
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, method, headers, credentials: 'same-origin' })
  } catch {
    throw new NetworkError('network')
  }
}

/**
 * Будить безкоштовний Render: GET /health (на бекенді він поза /api/v1, тому окремий проксі /api/health
 * у vercel.json і vite.config.ts). Відповідь не чекаємо й не читаємо, помилки ігноруємо.
 */
export function wakeBackend(): void {
  if (typeof fetch === 'undefined') return
  fetch('/api/health', { cache: 'no-store', credentials: 'omit' }).catch(() => {})
}

const isCsrfFailure =(status: number, detail: string | null) => status === 403 && !!detail && /csrf/i.test(detail)

/**
 * Запит до бекенду. Повертає розібраний JSON (або null для порожньої відповіді).
 * Помилки: ApiError зі статусом і detail, NetworkError, якщо сервер недоступний.
 * Якщо cookie csrf_token загубився, а сесія жива, один раз відновлює його (POST /auth/csrf/refresh) і повторює.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init)
  if (!res.ok) {
    let detail = await readDetail(res)
    if (isCsrfFailure(res.status, detail) && path !== '/auth/csrf/refresh') {
      const refreshed = await send('/auth/csrf/refresh', { method: 'POST' })
      if (refreshed.ok) {
        res = await send(path, init)
        detail = res.ok ? null : await readDetail(res)
      }
    }
    if (!res.ok) {
      if (res.status === 502 || res.status === 503 || res.status === 504) throw new NetworkError(`HTTP ${res.status}`)
      throw new ApiError(res.status, detail)
    }
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}
