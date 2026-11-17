import { beforeEach, describe, expect, it } from 'vitest'
import type { Account } from '../types/account'
import { migrateUserState, useUserStore } from './useUserStore'

const ana = { id: 'a1', name: 'Ana', email: 'ana@example.com' } as Account
const bob = { id: 'b1', name: 'Bob', email: 'bob@example.com' } as Account

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
      learnedWords: {},
      progressByAccount: {},
      completedLessons: {},
      activeLessons: {},
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
    expect(state).toMatchObject({ completedLessons: {}, activeLessons: {}, subtitleLangs: ['es'] })
  })

  describe('progress belongs to the account', () => {
    beforeEach(() =>
      useUserStore.setState({ account: null, completedLessons: {}, learnedWords: {}, progressByAccount: {} }),
    )

    it('records nothing for a guest', () => {
      const { recordLessonResult, recordWordLearned } = useUserStore.getState()
      recordLessonResult('l1', 'perfect', 3, 3)
      recordWordLearned('l1', 'g1')
      expect(useUserStore.getState()).toMatchObject({ completedLessons: {}, learnedWords: {} })
    })

    it('records lessons and distinct words for a signed-in user', () => {
      useUserStore.getState().setAccount(ana)
      const { recordLessonResult, recordWordLearned } = useUserStore.getState()
      recordWordLearned('l1', 'g1')
      recordWordLearned('l1', 'g1')
      recordWordLearned('l1', 'g2')
      recordLessonResult('l1', 'partial', 2, 3)
      expect(useUserStore.getState().learnedWords).toEqual({ l1: ['g1', 'g2'] })
      expect(useUserStore.getState().completedLessons.l1).toMatchObject({ outcome: 'partial', correct: 2, total: 3 })
    })

    it('keeps the best lesson result: a worse replay does not overwrite it', () => {
      useUserStore.getState().setAccount(ana)
      const { recordLessonResult } = useUserStore.getState()
      recordLessonResult('l1', 'perfect', 5, 5)
      recordLessonResult('l1', 'missed', 0, 5)
      expect(useUserStore.getState().completedLessons.l1).toMatchObject({ outcome: 'perfect', correct: 5 })
      recordLessonResult('l1', 'perfect', 5, 5)
      expect(useUserStore.getState().completedLessons.l1.correct).toBe(5)
    })

    it('hides progress after sign-out and brings it back on sign-in, separately per account', () => {
      const user = () => useUserStore.getState()
      user().setAccount(ana)
      user().recordWordLearned('l1', 'g1')
      user().setAccount(null)
      expect(user().learnedWords).toEqual({})
      user().setAccount(bob)
      expect(user().learnedWords).toEqual({})
      user().recordWordLearned('l2', 'g9')
      user().setAccount(ana)
      expect(user().learnedWords).toEqual({ l1: ['g1'] })
      user().setAccount(bob)
      expect(user().learnedWords).toEqual({ l2: ['g9'] })
    })
  })

  describe('unfinished lessons', () => {
    it('keeps the state of every lesson, so returning to an earlier video resumes it', () => {
      useUserStore.setState({ activeLessons: {} })
      const a = { status: 'playing', gapIndex: 2 } as never
      const b = { status: 'loading', gapIndex: 0 } as never
      useUserStore.getState().setActiveLesson('breaking-bad', a)
      useUserStore.getState().setActiveLesson('food-quiz', b)
      expect(useUserStore.getState().activeLessons).toEqual({ 'breaking-bad': a, 'food-quiz': b })
      useUserStore.getState().setActiveLesson('breaking-bad', null)
      expect(Object.keys(useUserStore.getState().activeLessons)).toEqual(['food-quiz'])
    })

    it('migrates the old single activeLesson into the per-lesson map', () => {
      const machine = { status: 'playing', gapIndex: 1 }
      expect(migrateUserState({ activeLesson: { lessonId: 'cafe-madrid', machine } }, 9)).toMatchObject({
        activeLessons: { 'cafe-madrid': machine },
      })
      expect(migrateUserState({ activeLesson: null }, 9)).toMatchObject({ activeLessons: {} })
    })
  })
})
