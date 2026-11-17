import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError, getCurrentAccount, signIn, signOut, signUp, usernameFromEmail } from './auth'

const code = (p: Promise<unknown>) => p.then(() => null, (e: AuthError) => e.code)

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const me = { id: 7, name: 'Olena', username: 'olena_1234', email: 'olena@example.com', profile_image_url: '', oauth_provider: null }

type Route = (init: RequestInit) => Response
let routes: Record<string, Route[]>
let calls: { key: string; init: RequestInit }[]

/** Черга відповідей на `METHOD /path`; останню повторюємо. */
function on(key: string, ...responses: Route[]) {
  routes[key] = responses
}

beforeEach(() => {
  routes = {}
  calls = []
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const key = `${init.method} ${url.replace('/api/v1', '')}`
    calls.push({ key, init })
    const queue = routes[key]
    if (!queue) throw new Error(`unexpected ${key}`)
    return (queue.length > 1 ? queue.shift()! : queue[0])(init)
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('auth api', () => {
  it('signs in with a form body and remember_me, then reads /users/me', async () => {
    on('POST /auth/login', () => json(200, { id: 7, username: 'olena_1234', csrf_token: 'x' }))
    on('GET /users/me', () => json(200, me))
    expect(await signIn({ email: ' Olena@Example.com ', password: 'Secret12!' })).toEqual({
      id: '7',
      email: 'olena@example.com',
      name: 'Olena',
      provider: 'password',
    })
    const body = new URLSearchParams(calls[0].init.body as string)
    expect(body.get('username')).toBe('olena@example.com')
    expect(body.get('remember_me')).toBe('true')
  })

  it('maps login failures', async () => {
    on('POST /auth/login', () => json(401, { detail: 'Incorrect username or password' }))
    expect(await code(signIn({ email: 'a@b.co', password: 'x' }))).toBe('wrongCredentials')
    on('POST /auth/login', () => json(429, { detail: 'Too many' }))
    expect(await code(signIn({ email: 'a@b.co', password: 'x' }))).toBe('tooManyAttempts')
    on('POST /auth/login', () => json(503, {}))
    expect(await code(signIn({ email: 'a@b.co', password: 'x' }))).toBe('serverUnavailable')
    on('POST /auth/login', () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await code(signIn({ email: 'a@b.co', password: 'x' }))).toBe('serverUnavailable')
  })

  it('validates sign-up input before calling the server', async () => {
    expect(await code(signUp({ name: ' ', email: 'a@b.co', password: 'Secret12!' }))).toBe('nameRequired')
    expect(await code(signUp({ name: 'Ana', email: 'nope', password: 'Secret12!' }))).toBe('invalidEmail')
    expect(await code(signUp({ name: 'Ana', email: 'a@b.co', password: 'short' }))).toBe('weakPassword')
    expect(calls).toHaveLength(0)
  })

  it('signs up with a generated username, retries a taken one, then signs in', async () => {
    on('POST /users/', () => json(409, { detail: 'Username not available' }), () => json(201, { message: 'ok' }))
    on('POST /auth/login', () => json(200, {}))
    on('GET /users/me', () => json(200, me))
    expect(await signUp({ name: 'Olena', email: 'olena@example.com', password: 'Secret12!' })).toMatchObject({ id: '7' })
    const sent = calls.filter((c) => c.key === 'POST /users/').map((c) => JSON.parse(c.init.body as string) as { username: string })
    expect(sent).toHaveLength(2)
    expect(sent[1].username).toMatch(/^olena_\d{4}$/)
  })

  it('tells which password requirements are missing when the server rejects the sign-up', async () => {
    on('POST /users/', () => json(422, { detail: 'Invalid request.' }))
    // M9JCJ8pPQGxvJKA: є великі, малі й цифри, але немає символу.
    const err = await signUp({ name: 'Ana', email: 'ana@example.com', password: 'M9JCJ8pPQGxvJKA' }).catch((e: unknown) => e)
    expect(err).toMatchObject({ code: 'signUpRejected', missing: ['symbol'] })
    const none = await signUp({ name: 'Ana', email: 'ana@example.com', password: 'abcdefgh' }).catch((e: unknown) => e)
    expect((none as { missing: string[] }).missing).toEqual(['upper', 'digit', 'symbol'])
  })

  it('reports a rejected sign-up and a taken email', async () => {
    on('POST /users/', () => json(422, { detail: 'Invalid request.' }))
    expect(await code(signUp({ name: 'Ana', email: 'ana@example.com', password: 'Secret12!' }))).toBe('signUpRejected')
    // Бекенд не каже, що email зайнятий: 201, але вхід із новим паролем не проходить.
    on('POST /users/', () => json(201, {}))
    on('POST /auth/login', () => json(401, { detail: 'Incorrect username or password' }))
    expect(await code(signUp({ name: 'Ana', email: 'ana@example.com', password: 'Secret12!' }))).toBe('signUpLoginFailed')
  })

  it('reads the current session', async () => {
    on('GET /users/me', () => json(200, { ...me, oauth_provider: 'google' }))
    expect(await getCurrentAccount()).toMatchObject({ id: '7', provider: 'google' })
    on('GET /users/me', () => json(401, { detail: 'Not authenticated' }))
    expect(await getCurrentAccount()).toBeNull()
  })

  it('signs out and ignores a dead session', async () => {
    on('POST /auth/logout', () => json(401, {}))
    await expect(signOut()).resolves.toBeUndefined()
  })

  it('makes usernames the backend accepts', () => {
    for (const email of ['Olena.K@x.com', '+++@x.com', 'a@x.com', `${'z'.repeat(60)}@x.com`]) {
      expect(usernameFromEmail(email)).toMatch(/^[a-z0-9_]{2,32}$/)
    }
  })
})
