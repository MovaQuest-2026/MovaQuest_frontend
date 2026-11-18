import type { ProfileFields, UserProfile } from '../types/profile'
import { readTable, writeTable } from './mockDb'

// Мок профілю в localStorage (VITE_MOCK_PROFILE=true). До появи /me/profile профілі жили тут,
// тож src/api/profile.ts бере звідси старий локальний профіль, якщо на сервері його ще немає.

export const GOAL_MAX_LENGTH = 200

export const clean = (fields: Partial<ProfileFields>): Partial<ProfileFields> =>
  fields.goal === undefined ? fields : { ...fields, goal: fields.goal.trim().slice(0, GOAL_MAX_LENGTH) }

/** null: профілю ще немає, тобто користувач не пройшов онбординг. */
export async function mockGetProfile(accountId: string): Promise<UserProfile | null> {
  return readTable<UserProfile>('profiles').find((p) => p.accountId === accountId) ?? null
}

/** Створює профіль після онбордингу (або перезаписує, якщо онбординг пройшли ще раз). */
export async function mockSaveProfile(accountId: string, fields: ProfileFields): Promise<UserProfile> {
  const now = new Date().toISOString()
  const rows = readTable<UserProfile>('profiles').filter((p) => p.accountId !== accountId)
  const profile: UserProfile = { accountId, ...fields, ...clean(fields), onboardedAt: now, updatedAt: now }
  writeTable('profiles', [...rows, profile])
  return profile
}

/** Часткове оновлення з профілю. Якщо профілю ще немає, нічого не робить і повертає null. */
export async function mockUpdateProfile(accountId: string, fields: Partial<ProfileFields>): Promise<UserProfile | null> {
  const rows = readTable<UserProfile>('profiles')
  const current = rows.find((p) => p.accountId === accountId)
  if (!current) return null
  const next: UserProfile = { ...current, ...clean(fields), updatedAt: new Date().toISOString() }
  writeTable('profiles', rows.map((p) => (p.accountId === accountId ? next : p)))
  return next
}
