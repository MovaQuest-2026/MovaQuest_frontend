import type { Lesson } from './lesson'

// Картка уроку в каталозі. Заглушки (comingSoon) мають лише базові поля.
export type LessonSummary = Pick<Lesson, 'id' | 'title' | 'description' | 'level' | 'cover'> & {
  durationSec?: number
  comingSoon?: boolean
}
