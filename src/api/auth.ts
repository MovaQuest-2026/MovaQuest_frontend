import { useUserStore } from '../store/useUserStore'
import type { Account } from '../types/account'
import { readTable, writeTable } from './mockDb'

export interface AnonymousUser {
  userId: string
  isAnonymous: true
}

// Зараз мок: локальний id з useUserStore. Пізніше тут буде anonymous sign-in
// у Firebase або Supabase, а id прийде від провайдера.
export async function getAnonymousUser(): Promise<AnonymousUser> {
  return { userId: useUserStore.getState().userId, isAnonymous: true }
}

export type { Account }

export type AuthErrorCode =
  | 'nameRequired'
  | 'invalidEmail'
  | 'weakPassword'
  | 'emailTaken'
  | 'wrongCredentials'
  | 'googleUnavailable'
  | 'googleFailed'
  | 'googleCancelled'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode) {
    super(code)
    this.code = code
  }
}

export const PASSWORD_MIN_LENGTH = 6

// ---------- Мок бекенду ----------
// Пізніше: POST /api/auth/sign-up, /sign-in, /sign-out (або Supabase Auth / Firebase Auth).
// Мок тримає облікові записи в localStorage цього браузера. Пароль не шифрується по-справжньому:
// це лише заглушка для прототипу, справжні паролі зберігатиме провайдер.

interface StoredAccount extends Account {
  passwordHash: string
}

// Таблиця accounts (ключ у localStorage лишився той самий: movaquest-mock-accounts).
const readAccounts = () => readTable<StoredAccount>('accounts')

/** FNV-1a. Не криптографія: лише щоб пароль не лежав у сховищі відкритим текстом. */
function mockHash(text: string): string {
  let h = 0x811c9dc5
  for (const ch of text) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16)
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()
const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const toAccount = ({ id, email, name }: StoredAccount): Account => ({ id, email, name, provider: 'password' })

export async function signUp(input: { name: string; email: string; password: string }): Promise<Account> {
  const name = input.name.trim()
  const email = normalizeEmail(input.email)
  if (!name) throw new AuthError('nameRequired')
  if (!isEmail(email)) throw new AuthError('invalidEmail')
  if (input.password.length < PASSWORD_MIN_LENGTH) throw new AuthError('weakPassword')
  const accounts = readAccounts()
  if (accounts.some((a) => a.email === email)) throw new AuthError('emailTaken')
  const stored: StoredAccount = {
    id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    name,
    passwordHash: mockHash(`${email}:${input.password}`),
  }
  writeTable('accounts', [...accounts, stored])
  return toAccount(stored)
}

export async function signIn(input: { email: string; password: string }): Promise<Account> {
  const email = normalizeEmail(input.email)
  if (!isEmail(email)) throw new AuthError('invalidEmail')
  const found = readAccounts().find((a) => a.email === email)
  // Однакова помилка для «немає такого email» і «неправильний пароль».
  if (!found || found.passwordHash !== mockHash(`${email}:${input.password}`)) throw new AuthError('wrongCredentials')
  return toAccount(found)
}

export async function signOut(): Promise<void> {}
