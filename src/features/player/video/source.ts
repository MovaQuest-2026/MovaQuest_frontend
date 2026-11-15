import type { VideoSource } from '../../../types/lesson'

/** Чи можна змінювати швидкість (плеєр TikTok цього не вміє). */
export function supportsPlaybackRate(source: VideoSource): boolean {
  return source.type === 'file'
}
