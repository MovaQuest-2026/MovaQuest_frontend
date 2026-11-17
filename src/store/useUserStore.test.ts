import { beforeEach, describe, expect, it } from 'vitest'
import { migrateUserState, useUserStore } from './useUserStore'

describe('useUserStore', () => {
  beforeEach(() => useUserStore.setState({ subtitleLangs: ['es'] }))

  it('keeps subtitle languages in a fixed order: original first, then translations', () => {
    const { toggleSubtitleLang } = useUserStore.getState()
    toggleSubtitleLang('uk')
    expect(useUserStore.getState().subtitleLangs).toEqual(['es', 'uk'])
    toggleSubtitleLang('en')
    expect(useUserStore.getState().subtitleLangs).toEqual(['es', 'en', 'uk'])
    toggleSubtitleLang('es')
    expect(useUserStore.getState().subtitleLangs).toEqual(['en', 'uk'])
  })

  it('migrates v2 subtitle on/off to a language list and adds the theme', () => {
    expect(migrateUserState({ subtitleMode: 'on', level: 'B1' }, 2)).toEqual({
      level: 'B1',
      subtitleLangs: ['es'],
      theme: 'system',
      likedLessons: [],
      savedLessons: [],
      account: null,
      signInPromptDismissed: false,
      onboardingPending: false,
    })
    expect(migrateUserState({ subtitleMode: 'off' }, 2)).toMatchObject({ subtitleLangs: [] })
  })

  it('toggles liked and saved lessons', () => {
    useUserStore.setState({ likedLessons: [], savedLessons: [] })
    const { toggleLiked, toggleSaved } = useUserStore.getState()
    toggleLiked('a')
    toggleSaved('a')
    toggleSaved('b')
    expect(useUserStore.getState()).toMatchObject({ likedLessons: ['a'], savedLessons: ['a', 'b'] })
    toggleLiked('a')
    expect(useUserStore.getState().likedLessons).toEqual([])
  })

  it('drops old progress when migrating from v1', () => {
    const state = migrateUserState({ subtitleMode: 'es+tr', completedLessons: { old: {} } }, 1)
    expect(state).toMatchObject({ completedLessons: {}, activeLesson: null, subtitleLangs: ['es'] })
  })
})
