import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./http', () => ({ apiFetch: vi.fn() }))

import { apiFetch } from './http'
import {
  deleteComment,
  getComments,
  getLessonStats,
  getMyReactions,
  peekLessonStats,
  prefetchLessonStats,
  postComment,
  setLessonLiked,
  setLessonSaved,
} from './social'

const api = vi.mocked(apiFetch)

beforeEach(() => api.mockClear())

describe('social api (backend)', () => {
  it('reads lesson counters', async () => {
    api.mockResolvedValue({ likes: 3, comments: 1, saves: 2, shares: 0 })
    expect(await getLessonStats('unknown-lesson')).toEqual({ likes: 3, comments: 1, saves: 2, shares: 0 })
    expect(api).toHaveBeenCalledWith('/lessons/unknown-lesson/stats')
  })

  it('prefetches counters into the cache so a neighbouring video does not start at zero', async () => {
    expect(peekLessonStats('next-lesson')).toBeNull()
    api.mockResolvedValue({ likes: 5, comments: 2, saves: 1, shares: 0 })
    prefetchLessonStats('next-lesson')
    await vi.waitFor(() => expect(peekLessonStats('next-lesson')).toEqual({ likes: 5, comments: 2, saves: 1, shares: 0 }))
    prefetchLessonStats('next-lesson')
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('adds the mock baseline to counters and puts mock comments after the last real page', async () => {
    api.mockResolvedValueOnce({ likes: 1, comments: 0, saves: 0, shares: 0 })
    const stats = await getLessonStats('cafe-madrid')
    expect(stats.likes).toBe(7962 + 1)
    api.mockResolvedValueOnce({ items: [{ id: '1', author: 'Ana', text: 'Hola', createdAt: '2026-11-17T10:00:00Z' }], nextCursor: null })
    const page = await getComments('cafe-madrid')
    expect(page.items[0].id).toBe('1')
    expect(page.items.length).toBeGreaterThan(1)
  })

  it('lists comments with a cursor and normalizes them', async () => {
    api.mockResolvedValue({
      items: [{ id: '7', author: 'Ana', text: 'Hola', createdAt: '2026-11-17T10:00:00Z' }],
      nextCursor: '7',
    })
    const page = await getComments('unknown-lesson', '12')
    expect(api).toHaveBeenCalledWith('/lessons/unknown-lesson/comments?limit=20&cursor=12')
    expect(page.nextCursor).toBe('7')
    expect(page.items[0]).toEqual({
      id: '7',
      author: 'Ana',
      text: 'Hola',
      createdAt: '2026-11-17T10:00:00Z',
      likes: 0,
      own: false,
    })
  })

  it('posts a trimmed comment as JSON and rejects an empty one', async () => {
    api.mockResolvedValue({ id: '9', author: 'Me', text: '¡Hola!', createdAt: '2026-11-17T10:00:00Z', own: true })
    const c = await postComment('cafe-madrid', '  ¡Hola!  ')
    expect(c).toMatchObject({ id: '9', own: true })
    const [path, init] = api.mock.calls[0]
    expect(path).toBe('/lessons/cafe-madrid/comments')
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ text: '¡Hola!' }) })
    await expect(postComment('cafe-madrid', '   ')).rejects.toThrow()
  })

  it('likes, saves, unlikes and deletes with the right verbs', async () => {
    api.mockResolvedValue(null)
    await setLessonLiked('cafe-madrid', true)
    await setLessonLiked('cafe-madrid', false)
    await setLessonSaved('cafe-madrid', true)
    await setLessonSaved('cafe-madrid', false)
    await deleteComment('cafe-madrid', '9')
    expect(api.mock.calls.map(([p, i]) => `${i?.method} ${p}`)).toEqual([
      'PUT /lessons/cafe-madrid/like',
      'DELETE /lessons/cafe-madrid/like',
      'PUT /lessons/cafe-madrid/save',
      'DELETE /lessons/cafe-madrid/save',
      'DELETE /comments/9',
    ])
  })

  it('reads my reactions', async () => {
    api.mockResolvedValue({ liked: ['a'], saved: ['b'] })
    expect(await getMyReactions()).toEqual({ liked: ['a'], saved: ['b'] })
    expect(api).toHaveBeenCalledWith('/me/reactions')
  })
})
