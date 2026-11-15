/** Мова інтерфейсу. */
export type Lang = 'en' | 'uk' | 'es'
/** Мови перекладу контенту. Іспанська тут не потрібна: це мова самих відео. */
export type TranslationLang = 'en' | 'uk'
/** Переклад слова чи фрази з іспанської. */
export type Translation = Record<TranslationLang, string>
/** Текст інтерфейсу уроку (назва, опис): є всіма мовами інтерфейсу, es необов'язкова. */
export type Localized = Translation & { es?: string }

/**
 * Звідки береться відео.
 * - file: локальний mp4 (плейсхолдери, власні кліпи) у public/clips/<lessonId>/.
 * - tiktok: вбудований плеєр TikTok (https://www.tiktok.com/player/v1/<videoId>), керуємо через postMessage.
 */
export type VideoSource =
  | { type: 'file'; src: string }
  | { type: 'tiktok'; videoId: string; author?: string }

/** Мова субтитрів: іспанський оригінал або переклад. */
export type SubtitleLang = 'es' | TranslationLang

/** Рядок субтитрів. Час у секундах від початку відео. */
export interface Cue {
  start: number
  end: number
  es: string
  /** Переклад рядка. Не має підказувати відповідь до паузи, як і сам рядок. */
  tr?: Partial<Translation>
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
  translation: Translation
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
