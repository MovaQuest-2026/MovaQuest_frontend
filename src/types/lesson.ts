export type Lang = 'en' | 'uk'
export type Localized = Record<Lang, string>

/**
 * Звідки береться відео.
 * - file: локальний mp4 (плейсхолдери, власні кліпи) у public/clips/<lessonId>/.
 * - tiktok: вбудований плеєр TikTok (https://www.tiktok.com/player/v1/<videoId>), керуємо через postMessage.
 */
export type VideoSource =
  | { type: 'file'; src: string }
  | { type: 'tiktok'; videoId: string; author?: string }

/** Рядок субтитрів. Час у секундах від початку відео. */
export interface Cue {
  start: number
  end: number
  es: string
}

/**
 * Пауза для відповіді.
 * - nextWord: користувач каже слово, яке прозвучить далі.
 * - answer: користувач відповідає на запитання з відео.
 */
export interface Gap {
  id: string
  kind: 'nextWord' | 'answer'
  /** Відео стає на паузу на цій секунді, до того як прозвучить відповідь. */
  pauseAt: number
  /** Фраза перед паузою, показується з пропуском: «Un café con ___». */
  context: string
  /** Канонічна відповідь, як її показуємо. */
  answer: string
  /** Інші прийнятні варіанти (нормалізовані: нижній регістр, без діакритики й пунктуації). */
  accept?: string[]
  translation: Localized
  /** Скільки невдалих спроб до автоматичного показу відповіді. */
  maxAttempts: number
}

export interface Lesson {
  id: string
  title: Localized
  description: Localized
  targetLanguage: 'es'
  level: 'A1' | 'A2' | 'B1' | 'B2'
  durationSec: number
  cover: string
  video: VideoSource
  cues: Cue[]
  /** Відсортовані за pauseAt. */
  gaps: Gap[]
}

export type Outcome = 'perfect' | 'partial' | 'missed'
