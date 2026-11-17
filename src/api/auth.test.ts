import { describe, expect, it } from 'vitest'
import { AuthError, signIn, signUp } from './auth'

const code = (p: Promise<unknown>) => p.then(() => null, (e: AuthError) => e.code)

describe('auth api (mock)', () => {
  it('signs up and then signs in with the same credentials', async () => {
    const acc = await signUp({ name: ' Olena ', email: 'Olena@Example.com', password: 'secret1' })
    expect(acc).toMatchObject({ name: 'Olena', email: 'olena@example.com', provider: 'password' })
    expect(await signIn({ email: 'olena@example.com ', password: 'secret1' })).toEqual(acc)
  })

  it('validates sign-up input', async () => {
    expect(await code(signUp({ name: '', email: 'a@b.co', password: 'secret1' }))).toBe('nameRequired')
    expect(await code(signUp({ name: 'A', email: 'nope', password: 'secret1' }))).toBe('invalidEmail')
    expect(await code(signUp({ name: 'A', email: 'a@b.co', password: '123' }))).toBe('weakPassword')
  })

  it('rejects a taken email and wrong credentials', async () => {
    await signUp({ name: 'Max', email: 'max@example.com', password: 'secret1' })
    expect(await code(signUp({ name: 'Max', email: 'MAX@example.com', password: 'other12' }))).toBe('emailTaken')
    expect(await code(signIn({ email: 'max@example.com', password: 'wrong12' }))).toBe('wrongCredentials')
    expect(await code(signIn({ email: 'ghost@example.com', password: 'secret1' }))).toBe('wrongCredentials')
  })
})
