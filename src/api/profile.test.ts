import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./http', async (importOriginal) => ({ ...(await importOriginal<typeof import('./http')>()), apiFetch: vi.fn() }))

import { ApiError, apiFetch } from './http'
import { getProfile, saveProfile, updateProfile } from './profile'
import { mockGetProfile, mockSaveProfile, mockUpdateProfile } from './profileMock'

const api = vi.mocked(apiFetch)
const profile = {
  accountId: '7',
  interfaceLanguage: 'uk',
  level: 'A2',
  goal: 'Erasmus',
  onboardedAt: '2026-11-18T10:00:00Z',
  updatedAt: '2026-11-18T10:00:00Z',
} as const
const body = (call: number) => JSON.parse(String(api.mock.calls[call][1]?.body))

beforeEach(() => api.mockReset())

describe('profile api (backend)', () => {
  it('reads the profile and treats 404 as "onboarding not done"', async () => {
    api.mockResolvedValueOnce(profile)
    expect(await getProfile('7')).toEqual(profile)
    expect(api).toHaveBeenCalledWith('/me/profile')
    api.mockRejectedValueOnce(new ApiError(404, 'Not found'))
    expect(await getProfile('no-local-profile')).toBeNull()
  })

  it('moves a profile saved only in this browser to the server', async () => {
    await mockSaveProfile('legacy', { interfaceLanguage: 'es', level: 'B1', goal: 'Sevilla' })
    api.mockRejectedValueOnce(new ApiError(404, null)).mockResolvedValueOnce({ ...profile, accountId: 'legacy' })
    expect((await getProfile('legacy'))?.accountId).toBe('legacy')
    expect(api.mock.calls[1][1]?.method).toBe('PUT')
    expect(body(1)).toEqual({ interfaceLanguage: 'es', level: 'B1', goal: 'Sevilla' })
  })

  it('passes other errors through', async () => {
    api.mockRejectedValueOnce(new ApiError(401, null))
    await expect(getProfile('7')).rejects.toBeInstanceOf(ApiError)
  })

  it('saves the onboarding answers with a trimmed goal', async () => {
    api.mockResolvedValueOnce(profile)
    await saveProfile('7', { interfaceLanguage: 'uk', level: 'A2', goal: '  Erasmus у Мадриді ' })
    expect(api.mock.calls[0][0]).toBe('/me/profile')
    expect(api.mock.calls[0][1]?.method).toBe('PUT')
    expect(body(0)).toEqual({ interfaceLanguage: 'uk', level: 'A2', goal: 'Erasmus у Мадриді' })
  })

  it('patches only the given fields and returns null without a profile', async () => {
    api.mockResolvedValueOnce(profile)
    await updateProfile('7', { level: 'B1' })
    expect(api.mock.calls[0][1]?.method).toBe('PATCH')
    expect(body(0)).toEqual({ level: 'B1' })
    api.mockRejectedValueOnce(new ApiError(404, null))
    expect(await updateProfile('7', { level: 'B2' })).toBeNull()
  })
})

describe('profile mock', () => {
  it('has no profile before onboarding', async () => {
    expect(await mockGetProfile('acc-new')).toBeNull()
    expect(await mockUpdateProfile('acc-new', { level: 'B1' })).toBeNull()
  })

  it('saves the onboarding answers and updates them later', async () => {
    const saved = await mockSaveProfile('acc-1', { interfaceLanguage: 'uk', level: 'A2', goal: '  Erasmus у Мадриді ' })
    expect(saved).toMatchObject({ accountId: 'acc-1', interfaceLanguage: 'uk', level: 'A2', goal: 'Erasmus у Мадриді' })
    expect(await mockGetProfile('acc-1')).toEqual(saved)

    const updated = await mockUpdateProfile('acc-1', { level: 'B1' })
    expect(updated).toMatchObject({ level: 'B1', interfaceLanguage: 'uk', onboardedAt: saved.onboardedAt })
    expect((await mockGetProfile('acc-1'))?.level).toBe('B1')
  })
})
