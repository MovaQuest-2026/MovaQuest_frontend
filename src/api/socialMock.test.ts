import { describe, expect, it } from 'vitest'
import {
  mockDeleteComment,
  mockGetComments,
  mockGetLessonStats,
  mockPostComment,
  mockRecordShare,
} from './socialMock'

describe('social mock', () => {
  it('returns zero stats for an unknown lesson', async () => {
    expect(await mockGetLessonStats('nope')).toEqual({ likes: 0, comments: 0, saves: 0, shares: 0 })
  })

  it('puts a posted comment first, counts it and can delete it', async () => {
    const before = await mockGetLessonStats('cafe-madrid')
    const c = await mockPostComment('cafe-madrid', '  ¡Hola!  ')
    expect(c).toMatchObject({ text: '¡Hola!', own: true })
    expect((await mockGetComments('cafe-madrid')).items[0].id).toBe(c.id)
    expect((await mockGetLessonStats('cafe-madrid')).comments).toBe(before.comments + 1)
    await mockDeleteComment('cafe-madrid', c.id)
    expect((await mockGetLessonStats('cafe-madrid')).comments).toBe(before.comments)
  })

  it('rejects an empty comment', async () => {
    await expect(mockPostComment('cafe-madrid', '   ')).rejects.toThrow()
  })

  it('counts shares', async () => {
    const before = await mockGetLessonStats('metro-tips')
    await mockRecordShare('metro-tips')
    expect((await mockGetLessonStats('metro-tips')).shares).toBe(before.shares + 1)
  })
})
