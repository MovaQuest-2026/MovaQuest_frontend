import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./http', () => ({ apiFetch: vi.fn() }))

import { apiFetch } from './http'
import {
  clearActiveLesson,
  getProgress,
  importProgress,
  markWordsLearned,
  resetProgressRemote,
  saveActiveLesson,
  saveLessonResult,
} from './progress'
import { mockGetProgress, mockImportProgress, mockSaveActiveLesson, mockSaveLessonResult } from './progressMock'
import { emptyProgress, mergeProgress, type Progress } from '../types/progress'

const api = vi.mocked(apiFetch)
const machine = { status: 'playing', gapIndex: 1 } as never
const result = { outcome: 'partial', correct: 2, total: 3, completedAt: '2026-11-18T10:00:00.000Z' } as const

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue(null)
})

const body = (call: number) => JSON.parse(String(api.mock.calls[call][1]?.body))

describe('progress api (backend)', () => {
  it('reads and imports the whole progress', async () => {
    await getProgress('a1')
    expect(api).toHaveBeenCalledWith('/me/progress')
    const local: Progress = { ...emptyProgress(), learnedWords: { l1: ['día'] } }
    await importProgress('a1', local)
    expect(api.mock.calls[1][0]).toBe('/me/progress/import')
    expect(api.mock.calls[1][1]?.method).toBe('POST')
    expect(body(1)).toEqual(local)
  })

  it('saves a lesson result with the gap ids kept out of the path', async () => {
    await saveLessonResult('a1', 'cafe-madrid', result)
    expect(api.mock.calls[0][0]).toBe('/me/progress/lessons/cafe-madrid')
    expect(api.mock.calls[0][1]?.method).toBe('PUT')
    expect(body(0)).toEqual(result)
  })

  it('sends learned words in batches of at most 500 and nothing for an empty list', async () => {
    await markWordsLearned('a1', [])
    expect(api).not.toHaveBeenCalled()
    const items = Array.from({ length: 501 }, (_, i) => ({ lessonId: 'l1', gapId: `g${i}` }))
    await markWordsLearned('a1', items, true)
    expect(api).toHaveBeenCalledTimes(2)
    expect(body(0).items).toHaveLength(500)
    expect(body(1).items).toEqual([{ lessonId: 'l1', gapId: 'g500' }])
    expect(api.mock.calls[0][1]?.keepalive).toBe(true)
  })

  it('saves and clears an unfinished lesson and resets everything', async () => {
    await saveActiveLesson('a1', 'l1', { machine, updatedAt: result.completedAt })
    expect(api.mock.calls[0][0]).toBe('/me/progress/active/l1')
    expect(body(0)).toEqual({ machine, updatedAt: result.completedAt })
    await clearActiveLesson('a1', 'l1')
    expect(api.mock.calls[1]).toEqual(['/me/progress/active/l1', { method: 'DELETE' }])
    await resetProgressRemote('a1')
    expect(api.mock.calls[2]).toEqual(['/me/progress', { method: 'DELETE' }])
  })
})

describe('mergeProgress', () => {
  it('keeps the better result, unions words and takes the later snapshot', () => {
    const a: Progress = {
      completedLessons: { l1: { ...result, correct: 3 }, l2: result },
      learnedWords: { l1: ['g1'] },
      activeLessons: { l3: { machine, updatedAt: '2026-11-18T10:00:00Z' } },
    }
    const b: Progress = {
      completedLessons: { l1: result, l2: { ...result, completedAt: '2026-11-18T11:00:00Z' } },
      learnedWords: { l1: ['g2', 'g1'], l2: ['x'] },
      activeLessons: { l3: { machine, updatedAt: '2026-11-18T09:00:00Z' } },
    }
    const merged = mergeProgress(a, b)
    expect(merged.completedLessons.l1.correct).toBe(3)
    expect(merged.completedLessons.l2.completedAt).toBe('2026-11-18T11:00:00Z') // рівний результат: з incoming
    expect(merged.learnedWords).toEqual({ l1: ['g1', 'g2'], l2: ['x'] })
    expect(merged.activeLessons.l3.updatedAt).toBe('2026-11-18T10:00:00Z')
  })

  it('drops a snapshot taken before the lesson was completed', () => {
    const merged = mergeProgress(
      { ...emptyProgress(), completedLessons: { l1: result } },
      { ...emptyProgress(), activeLessons: { l1: { machine, updatedAt: '2026-11-18T09:59:00Z' } } },
    )
    expect(merged.activeLessons).toEqual({})
  })
})

describe('progress mock', () => {
  it('merges imports per account and clears the snapshot when a lesson is completed', async () => {
    await mockImportProgress('m1', {
      ...emptyProgress(),
      learnedWords: { l1: ['g1'] },
      activeLessons: { l1: { machine, updatedAt: '2026-11-18T09:00:00Z' } },
    })
    await mockSaveActiveLesson('m1', 'l1', { machine, updatedAt: '2026-11-18T08:00:00Z' })
    expect((await mockGetProgress('m1')).activeLessons.l1.updatedAt).toBe('2026-11-18T09:00:00Z')
    const saved = await mockSaveLessonResult('m1', 'l1', result)
    expect(saved).toEqual(result)
    const worse = await mockSaveLessonResult('m1', 'l1', { ...result, correct: 0, outcome: 'missed' })
    expect(worse.correct).toBe(2)
    const progress = await mockGetProgress('m1')
    expect(progress.activeLessons).toEqual({})
    expect(progress.learnedWords).toEqual({ l1: ['g1'] })
    expect(await mockGetProgress('other')).toEqual(emptyProgress())
  })
})
