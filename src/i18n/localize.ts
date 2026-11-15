import type { Lang, Localized, Translation } from '../types/lesson'

export function localize(text: Localized, lang: Lang): string {
  return text[lang] ?? text.en
}

/**
 * Переклад іспанського слова мовою інтерфейсу.
 * В іспанському інтерфейсі перекладу немає (це було б те саме слово), тоді null.
 */
export function translate(text: Translation, lang: Lang): string | null {
  return lang === 'es' ? null : text[lang]
}
