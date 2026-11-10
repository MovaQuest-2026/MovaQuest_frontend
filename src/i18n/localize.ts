import type { Lang, Localized } from '../types/lesson'

export function localize(text: Localized, lang: Lang): string {
  return text[lang] ?? text.en
}
