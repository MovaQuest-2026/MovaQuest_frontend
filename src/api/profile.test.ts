import { describe, expect, it } from 'vitest'
import { getProfile, saveProfile, updateProfile } from './profile'

describe('profile api (mock)', () => {
  it('has no profile before onboarding', async () => {
    expect(await getProfile('acc-new')).toBeNull()
    expect(await updateProfile('acc-new', { level: 'B1' })).toBeNull()
  })

  it('saves the onboarding answers and updates them later', async () => {
    const saved = await saveProfile('acc-1', { interfaceLanguage: 'uk', level: 'A2', goal: '  Erasmus у Мадриді ' })
    expect(saved).toMatchObject({ accountId: 'acc-1', interfaceLanguage: 'uk', level: 'A2', goal: 'Erasmus у Мадриді' })
    expect(await getProfile('acc-1')).toEqual(saved)

    const updated = await updateProfile('acc-1', { level: 'B1' })
    expect(updated).toMatchObject({ level: 'B1', interfaceLanguage: 'uk', onboardedAt: saved.onboardedAt })
    expect((await getProfile('acc-1'))?.level).toBe('B1')
  })
})
