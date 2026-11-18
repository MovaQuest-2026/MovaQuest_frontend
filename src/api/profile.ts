import type { ProfileFields, UserProfile } from '../types/profile'
import { ApiError, apiFetch } from './http'
import { clean, mockGetProfile, mockSaveProfile, mockUpdateProfile } from './profileMock'

// Профіль з онбордингу (мова інтерфейсу, рівень, мета): бекенд /api/v1/me/profile, акаунт із сесії (гість: 401).
//   GET   /me/profile   → UserProfile | 404 (онбординг ще не пройдено)
//   PUT   /me/profile   { interfaceLanguage, level, goal } → UserProfile (створює або перезаписує, ставить onboardedAt)
//   PATCH /me/profile   частина тих самих полів → UserProfile | 404
// accountId потрібен лише моку (VITE_MOCK_PROFILE=true). Схема: src/types/profile.ts.

const MOCK = import.meta.env.VITE_MOCK_PROFILE === 'true'
const PATH = '/me/profile'

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const isNotFound = (err: unknown) => err instanceof ApiError && err.status === 404

/** null: профілю ще немає, тобто користувач не пройшов онбординг. */
export async function getProfile(accountId: string): Promise<UserProfile | null> {
  if (MOCK) return mockGetProfile(accountId)
  try {
    return await apiFetch<UserProfile>(PATH)
  } catch (err) {
    if (!isNotFound(err)) throw err
  }
  // До /me/profile онбординг зберігався лише в цьому браузері: переносимо його на сервер, щоб не питати вдруге.
  const local = await mockGetProfile(accountId)
  if (!local) return null
  const { interfaceLanguage, level, goal } = local
  return saveProfile(accountId, { interfaceLanguage, level, goal })
}

/** Створює профіль після онбордингу (або перезаписує, якщо онбординг пройшли ще раз). */
export async function saveProfile(accountId: string, fields: ProfileFields): Promise<UserProfile> {
  if (MOCK) return mockSaveProfile(accountId, fields)
  const { interfaceLanguage, level, goal } = { ...fields, ...clean(fields) }
  return apiFetch<UserProfile>(PATH, json('PUT', { interfaceLanguage, level, goal }))
}

/** Часткове оновлення з профілю. Якщо профілю ще немає, нічого не робить і повертає null. */
export async function updateProfile(accountId: string, fields: Partial<ProfileFields>): Promise<UserProfile | null> {
  if (MOCK) return mockUpdateProfile(accountId, fields)
  // Сервер не приймає явний null: надсилаємо лише задані поля.
  const body = Object.fromEntries(Object.entries(clean(fields)).filter(([, v]) => v !== undefined && v !== null))
  try {
    return await apiFetch<UserProfile>(PATH, json('PATCH', body))
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}
