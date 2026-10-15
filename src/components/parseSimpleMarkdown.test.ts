import { describe, expect, it } from 'vitest'
import { parseSimpleMarkdown } from './parseSimpleMarkdown'

describe('parseSimpleMarkdown', () => {
  it('розбирає заголовки, списки і абзаци', () => {
    const blocks = parseSimpleMarkdown(
      '# Credits\n\nIntro line one\nline two\n\n## Tiles\n- Kenney\n* LPC\nAfter list\n',
    )
    expect(blocks).toEqual([
      { type: 'heading', level: 1, text: 'Credits' },
      { type: 'paragraph', text: 'Intro line one line two' },
      { type: 'heading', level: 2, text: 'Tiles' },
      { type: 'list', items: ['Kenney', 'LPC'] },
      { type: 'paragraph', text: 'After list' },
    ])
  })

  it('порожній текст дає порожній список', () => {
    expect(parseSimpleMarkdown('\n\n')).toEqual([])
  })
})
