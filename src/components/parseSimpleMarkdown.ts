// Мінімальний розбір Markdown для титрів: заголовки, списки і абзаци. Без HTML і вкладеності.

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string }

export function parseSimpleMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: string[] | null = null

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
      paragraph = []
    }
    if (list) {
      blocks.push({ type: 'list', items: list })
      list = null
    }
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      flush()
      continue
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      })
      continue
    }

    const item = /^[-*]\s+(.*)$/.exec(line)
    if (item) {
      if (paragraph.length) flush()
      list ??= []
      list.push(item[1])
      continue
    }

    if (list) flush()
    paragraph.push(line)
  }
  flush()
  return blocks
}
