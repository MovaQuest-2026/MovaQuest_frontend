import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/progress', () => ({
  importProgress: vi.fn(),
  saveLessonResult: vi.fn(),
  markWordsLearned: vi.fn(),
  saveActiveLesson: vi.fn(),
  clearActiveLesson: vi.fn(),
}))

import * as api from '../../api/progress'
import { useUserStore } from '../../store/useUserStore'
import type { Account } from '../../types/account'
import { emptyProgress } from '../../types/progress'
import { startProgressSync } from './useProgressSync'

const ana = { id: 'a1', name: 'Ana', email: 'ana@example.com' } as Account
const bob = { id: 'b1', name: 'Bob', email: 'bob@example.com' } as Account
const machine = { status: 'playing', gapIndex: 1 } as never
const user = () => useUserStore.getState()
const mocked = vi.mocked(api)

let stop: () => void

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  mocked.importProgress.mockResolvedValue(emptyProgress())
  mocked.saveLessonResult.mockImplementation(async (_a, _l, r) => r)
  mocked.markWordsLearned.mockResolvedValue()
  mocked.saveActiveLesson.mockImplementation(async (_a, _l, active) => active)
  mocked.clearActiveLesson.mockResolvedValue()
  useUserStore.setState({ account: null, completedLessons: {}, learnedWords: {}, activeLessons: {}, progressByAccount: {} })
})

afterEach(() => {
  stop?.()
  vi.useRealTimers()
})

describe('progress sync', () => {
  it('does nothing for a guest', async () => {
    stop = startProgressSync()
    user().setActiveLesson('l1', machine)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(mocked.importProgress).not.toHaveBeenCalled()
    expect(mocked.saveActiveLesson).not.toHaveBeenCalled()
  })

  it('imports on sign-in and does not send the received progress back', async () => {
    mocked.importProgress.mockResolvedValue({
      ...emptyProgress(),
      learnedWords: { l9: ['g1'] },
      activeLessons: { l9: { machine, updatedAt: '2026-11-18T10:00:00Z' } },
    })
    stop = startProgressSync()
    user().setActiveLesson('guest', machine)
    user().setAccount(ana)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(mocked.importProgress).toHaveBeenCalledTimes(1)
    expect(Object.keys(mocked.importProgress.mock.calls[0][1].activeLessons)).toEqual(['guest'])
    expect(user().learnedWords).toEqual({ l9: ['g1'] })
    expect(Object.keys(user().activeLessons).sort()).toEqual(['guest', 'l9'])
    expect(mocked.markWordsLearned).not.toHaveBeenCalled()
    expect(mocked.saveActiveLesson).not.toHaveBeenCalled()
  })

  it('ignores an import answer that arrives after the account changed', async () => {
    let resolve!: (p: ReturnType<typeof emptyProgress>) => void
    mocked.importProgress.mockReturnValueOnce(new Promise((r) => (resolve = r)))
    stop = startProgressSync()
    user().setAccount(ana)
    user().setAccount(bob)
    resolve({ ...emptyProgress(), learnedWords: { ana: ['secret'] } })
    await vi.advanceTimersByTimeAsync(0)
    expect(user().learnedWords).toEqual({})
  })

  it('sends results, words in a batch and the last snapshot of a lesson', async () => {
    user().setAccount(ana)
    stop = startProgressSync()
    await vi.advanceTimersByTimeAsync(0)
    user().setActiveLesson('l1', machine)
    user().setActiveLesson('l1', { ...(machine as object), gapIndex: 2 } as never)
    user().recordWordLearned('l1', 'g1')
    user().recordWordLearned('l1', 'día')
    await vi.advanceTimersByTimeAsync(2_500)
    expect(mocked.markWordsLearned).toHaveBeenCalledTimes(1)
    expect(mocked.markWordsLearned.mock.calls[0][1]).toEqual([
      { lessonId: 'l1', gapId: 'g1' },
      { lessonId: 'l1', gapId: 'día' },
    ])
    expect(mocked.saveActiveLesson).toHaveBeenCalledTimes(1)
    expect(mocked.saveActiveLesson.mock.calls[0][2].machine).toMatchObject({ gapIndex: 2 })

    // Завершення: результат іде одразу, відкладений знімок скасовується, DELETE не потрібен.
    user().setActiveLesson('l1', machine)
    user().recordLessonResult('l1', 'perfect', 3, 3)
    user().setActiveLesson('l1', null)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(mocked.saveLessonResult).toHaveBeenCalledTimes(1)
    expect(mocked.saveLessonResult.mock.calls[0][2]).toMatchObject({ outcome: 'perfect', correct: 3 })
    expect(mocked.saveActiveLesson).toHaveBeenCalledTimes(1)
    expect(mocked.clearActiveLesson).not.toHaveBeenCalled()
  })

  it('clears a snapshot on the server when it is dropped without completing the lesson', async () => {
    user().setAccount(ana)
    user().setActiveLesson('l1', machine)
    stop = startProgressSync()
    await vi.advanceTimersByTimeAsync(0)
    user().setActiveLesson('l1', null)
    await vi.advanceTimersByTimeAsync(0)
    expect(mocked.clearActiveLesson).toHaveBeenCalledWith('a1', 'l1')
  })
})
