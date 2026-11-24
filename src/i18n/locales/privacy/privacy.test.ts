import { describe, expect, it } from 'vitest'
import type { PrivacyBlock, PrivacySection } from '../../../pages/PrivacyPage'
import en from './en.json'
import uk from './uk.json'
import es from './es.json'

// Форма блоку без тексту: тип і кількість рядків/клітинок. Переклади мають збігатися з англійською.
function shape(policy: unknown) {
  return (policy as { sections: PrivacySection[] }).sections.map((s) => ({
    id: s.id,
    blocks: s.blocks.map((b: PrivacyBlock) => {
      if ('ul' in b) return `ul:${b.ul.length}`
      if ('table' in b) return `table:${b.table.head.length}x${b.table.rows.map((r) => r.length).join(',')}`
      return Object.keys(b).join()
    }),
  }))
}

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []

const vars = (policy: unknown) => [...JSON.stringify(policy).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()

describe('privacy policy translations', () => {
  it.each([
    ['uk', uk],
    ['es', es],
  ])('%s has the same structure and placeholders as en', (_, policy) => {
    expect(shape(policy)).toEqual(shape(en))
    expect(vars(policy)).toEqual(vars(en))
  })

  // Чернеткові позначки на кшталт «[уточнити]» не мають потрапити на публічну сторінку.
  it('has no draft placeholders in brackets', () => {
    for (const policy of [en, uk, es]) expect(strings(policy).filter((s) => s.includes('['))).toEqual([])
  })
})
