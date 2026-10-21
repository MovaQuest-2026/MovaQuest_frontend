import { describe, expect, it } from 'vitest'
import picnicOlena from '../../mocks/dialogues/picnic_olena.ink.json'
import picnicIvanka from '../../mocks/dialogues/picnic_ivanka.ink.json'
import picnicQuest from '../../mocks/quests/picnic_main.json'
import { runDialogue } from './inkTestUtils'

describe('рівень «Пікнік у парку»', () => {
  it('Іванка не відкривається, поки Олена нічого не навчила', () => {
    const run = runDialogue(picnicIvanka, {})
    expect(run.flags.ivanka_called).not.toBe(true)
    expect(run.lines).toHaveLength(1)
  })

  it('Олена вчить слова і ставить picnic_taught, вправи йдуть послідовно', () => {
    const run = runDialogue(picnicOlena, {})
    expect(run.flags.picnic_taught).toBe(true)
    expect(run.tags).toEqual(
      expect.arrayContaining(['quiz:picnic_read_1', 'quiz:picnic_ready_1']),
    )
  })

  it('англійською Іванка не розуміє, українською кличеться', () => {
    const run = runDialogue(picnicIvanka, { picnic_taught: true }, { choices: ['Your mom', 0, 0] })
    expect(run.lines.some((line) => line.includes('Я не розумію'))).toBe(true)
    expect(run.flags.ivanka_called).toBe(true)
  })

  it('Олена після виклику Іванки завершує пікнік і рівень', () => {
    const run = runDialogue(picnicOlena, { picnic_taught: true, ivanka_called: true })
    expect(run.flags.picnic_done).toBe(true)
    expect(run.tags).toContain('ending:picnic')
  })

  it('кроки квесту йдуть за прапорцями діалогів', () => {
    expect(picnicQuest.steps.map((step) => step.completeWhen)).toEqual([
      { flag: 'picnic_taught' },
      { flag: 'ivanka_called' },
      { flag: 'picnic_done' },
    ])
  })
})
