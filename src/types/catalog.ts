import type { Lesson } from './lesson'

// Картка уроку в каталозі. Заглушки (comingSoon) мають лише базові поля.
export type LessonSummary = Pick<Lesson, 'id' | 'title' | 'description' | 'level' | 'cover'> & {
  durationSec?: number
  comingSoon?: boolean
  /** Коли урок додано (ISO-дата). Стрічка й /app починаються з найновіших. */
  addedAt?: string
  /** Закріплений урок іде першим у стрічці й відкривається на /app, хай які дати в нових уроків. */
  pinned?: boolean
}
