import { describe, expect, it } from 'vitest'
import { getComments, getLessonStats, postComment, recordShare } from './social'

describe('social api (mock)', () => {
  it('returns zero stats for an unknown lesson', async () => {
    expect(await getLessonStats('nope')).toEqual({ likes: 0, comments: 0, saves: 0, shares: 0 })
  })

  it('puts a posted comment first and counts it', async () => {
    const before = await getLessonStats('cafe-madrid')
    const c = await postComment('cafe-madrid', 'me', '  ¡Hola!  ')
    expect(c).toMatchObject({ text: '¡Hola!', own: true })
    expect((await getComments('cafe-madrid'))[0].id).toBe(c.id)
    expect((await getLessonStats('cafe-madrid')).comments).toBe(before.comments + 1)
  })

  it('rejects an empty comment', async () => {
    await expect(postComment('cafe-madrid', 'me', '   ')).rejects.toThrow()
  })

  it('counts shares', async () => {
    const before = await getLessonStats('metro-tips')
    await recordShare('metro-tips')
    expect((await getLessonStats('metro-tips')).shares).toBe(before.shares + 1)
  })
})
