import { describe, expect, it } from 'vitest'
import { normalize } from '../lib/matchAnswer'
import { getLesson } from './getLesson'
import { getLessons } from './getLessons'

const PLAYABLE = [
  'breaking-bad',
  'food-quiz',
  'picture-words',
  'words-quiz',
  'haz-tu-tarea',
  'cafe-madrid',
  'metro-tips',
  'hola-lucia',
]

describe('lessons api', () => {
  it('lists the catalog: playable videos and one stub', async () => {
    const list = await getLessons()
    expect(list.map((l) => l.id)).toEqual([...PLAYABLE, 'tiktok-street'])
    expect(list.filter((l) => l.comingSoon).map((l) => l.id)).toEqual(['tiktok-street'])
  })

  it.each(PLAYABLE)('loads %s with consistent cues and gaps', async (id) => {
    const lesson = await getLesson(id)
    expect(lesson.id).toBe(id)
    expect(lesson.gaps.length).toBeGreaterThan(0)
    // Назва й опис є всіма мовами інтерфейсу, зокрема іспанською.
    for (const text of [lesson.title, lesson.description]) {
      expect(text.en && text.uk && text.es).toBeTruthy()
    }
    if (lesson.video.type === 'file') expect(lesson.video.src).toBe(`/clips/${id}/video.mp4`)

    for (const cue of lesson.cues) {
      expect(cue.end).toBeGreaterThan(cue.start)
      expect(cue.end).toBeLessThanOrEqual(lesson.durationSec)
      // Субтитри можна вмикати мовою інтерфейсу: кожен рядок має переклад.
      expect(cue.tr?.en?.trim()).toBeTruthy()
      expect(cue.tr?.uk?.trim()).toBeTruthy()
    }

    const ids = new Set<string>()
    let prev = 0
    for (const gap of lesson.gaps) {
      expect(ids.has(gap.id)).toBe(false)
      ids.add(gap.id)
      expect(gap.pauseAt).toBeGreaterThan(prev)
      expect(gap.pauseAt).toBeLessThan(lesson.durationSec)
      expect(gap.maxAttempts).toBeGreaterThanOrEqual(1)
      prev = gap.pauseAt
      for (const a of gap.accept ?? []) expect(a).toBe(normalize(a))

      // Субтитр, видимий у момент паузи, не має підказувати відповідь.
      const answer = normalize(gap.answer)
      const visible = lesson.cues.filter((c) => c.start < gap.pauseAt && c.end >= gap.pauseAt - 0.01)
      for (const cue of visible) expect(` ${normalize(cue.es)} `).not.toContain(` ${answer} `)
    }
  })

  it('rejects an unknown lesson id', async () => {
    await expect(getLesson('nope')).rejects.toThrow('Unknown lesson: nope')
  })
})
