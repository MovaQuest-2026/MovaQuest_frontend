import type { LessonSummary } from '../types/catalog'

// Зараз читає мок. Пізніше: GET {API_URL}/api/lessons.
const catalog = import.meta.glob<LessonSummary[]>('../mocks/lessons/index.json', {
  import: 'default',
})

export async function getLessons(): Promise<LessonSummary[]> {
  const load = catalog['../mocks/lessons/index.json']
  if (!load) throw new Error('Lesson catalog is missing')
  return load()
}
