import { describe, expect, it } from 'vitest'
import { getLesson } from './getLesson'
import { getLessons } from './getLessons'

describe('lessons api', () => {
  it('lists the catalog with one playable lesson and two stubs', async () => {
    const list = await getLessons()
    expect(list.map((l) => l.id)).toEqual(['shop-spain', 'hotel-checkin', 'taxi-ride'])
    expect(list.filter((l) => l.comingSoon).map((l) => l.id)).toEqual(['hotel-checkin', 'taxi-ride'])
  })

  it('loads shop-spain with a consistent scene graph', async () => {
    const lesson = await getLesson('shop-spain')
    const ids = new Set(lesson.scenes.map((s) => s.id))
    expect(ids.has(lesson.startSceneId)).toBe(true)
    for (const scene of lesson.scenes) {
      if (scene.choice) {
        expect(scene.choice.phrases.map((p) => p.branch).sort()).toEqual(['correct', 'unclear', 'wrong'])
        expect(scene.choice.maxRetries).toBe(2)
        for (const target of Object.values(scene.choice.next)) expect(ids.has(target)).toBe(true)
        for (const phrase of scene.choice.phrases) {
          if (phrase.branch === 'unclear') continue
          expect(phrase.accept?.length).toBeGreaterThanOrEqual(2)
          for (const a of phrase.accept ?? []) expect(a).toMatch(/^[a-zñ ]+$/)
        }
      }
      if (scene.next && scene.next !== '$return') expect(ids.has(scene.next)).toBe(true)
      if (scene.kind === 'end') expect(scene.outcome).toBeDefined()
    }
  })

  it('rejects an unknown lesson id', async () => {
    await expect(getLesson('nope')).rejects.toThrow('Unknown lesson: nope')
  })
})
