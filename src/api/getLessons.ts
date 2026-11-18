import type { LessonSummary } from '../types/catalog'

// Зараз читає мок. Пізніше: GET {API_URL}/api/lessons (бекенд одразу віддає найновіші першими).
const catalog = import.meta.glob<LessonSummary[]>('../mocks/lessons/index.json', {
  import: 'default',
})

/**
 * Закріплені (pinned) першими, далі найновіші; з однаковою датою — у порядку каталогу. Без дати — в кінці.
 */
export function sortByAddedAt(list: LessonSummary[]): LessonSummary[] {
  return list
    .map((lesson, i) => ({ lesson, i }))
    .sort(
      (a, b) =>
        Number(!!b.lesson.pinned) - Number(!!a.lesson.pinned) ||
        (b.lesson.addedAt ?? '').localeCompare(a.lesson.addedAt ?? '') ||
        a.i - b.i,
    )
    .map((x) => x.lesson)
}

export async function getLessons(): Promise<LessonSummary[]> {
  const load = catalog['../mocks/lessons/index.json']
  if (!load) throw new Error('Lesson catalog is missing')
  return sortByAddedAt(await load())
}

/** Перший доступний урок стрічки (закріплений або найновіший, без comingSoon) або null, якщо таких немає. */
export async function getLatestLessonId(): Promise<string | null> {
  return (await getLessons()).find((l) => !l.comingSoon)?.id ?? null
}
