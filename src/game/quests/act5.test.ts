import { describe, expect, it } from 'vitest'
import embSolomiia from '../../mocks/dialogues/emb_solomiia.ink.json'
import embCrowd from '../../mocks/dialogues/emb_crowd.ink.json'
import embPhone from '../../mocks/dialogues/emb_phone.ink.json'
import { runDialogue } from './inkTestUtils'
import type { QuestFlags } from './questEngine'

function endingOf(tags: string[]) {
  return tags.find((tag) => tag.startsWith('ending:'))?.slice('ending:'.length)
}

describe('акт 5: телефон і натовп', () => {
  it('emb_phone ставить know_outfit за будь-якої відповіді', () => {
    for (const quizOk of [true, false]) {
      const run = runDialogue(embPhone, {}, { quizOk })
      expect(run.flags.know_outfit).toBe(true)
      expect(run.tags).toContain('clock:19:30')
    }
  })

  it('emb_crowd з keepState дає всі п\'ять реплік без повторів', () => {
    expect(embCrowd.keepState).toBe(true)
    const lines: string[] = []
    let savedState: string | undefined
    for (let talk = 0; talk < 5; talk++) {
      const run = runDialogue(embCrowd, {}, { savedState })
      lines.push(run.lines[0])
      savedState = run.state
    }
    expect(new Set(lines).size).toBe(5)
  })
})

describe('акт 5: Соломія і три кінцівки', () => {
  const allTasks: QuestFlags = { task_flowers: true, task_dessert: true, task_show_time: true }

  it('best: trust >= 6 і малюнок; кат-сцена фонтану перед кінцівкою', () => {
    const run = runDialogue(embSolomiia, { ...allTasks, trust: 6, has_drawing: true }, { choices: ['Із задоволенням'] })
    expect(endingOf(run.tags)).toBe('best')
    expect(run.tags).toEqual(expect.arrayContaining(['cutscene:fountain', 'clock:20:00', 'take:flowers', 'take:dessert']))
    expect(run.tags.indexOf('cutscene:fountain')).toBeLessThan(run.tags.indexOf('ending:best'))
  })

  it('знання про Пирогова додає довіри і може дати best', () => {
    const run = runDialogue(
      embSolomiia,
      { ...allTasks, trust: 5, has_drawing: true, knows_pirogov: true },
      { choices: ['Пирогов був хірургом'] },
    )
    expect(run.flags.trust).toBe(6)
    expect(endingOf(run.tags)).toBe('best')
  })

  it('good: висока довіра без малюнка або trust 3–5', () => {
    expect(endingOf(runDialogue(embSolomiia, { ...allTasks, trust: 8 }).tags)).toBe('good')
    expect(endingOf(runDialogue(embSolomiia, { trust: 3, has_drawing: true }).tags)).toBe('good')
  })

  it('basic: trust < 3', () => {
    const run = runDialogue(embSolomiia, { trust: 2 }, { choices: ['А хто такий Пирогов'] })
    expect(endingOf(run.tags)).toBe('basic')
    expect(run.tags).not.toContain('take:flowers')
  })
})
