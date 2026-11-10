import type { Lesson } from '../types/lesson'

// Зараз читає мок. Пізніше: GET {API_URL}/api/lessons/{id}.
const lessons = import.meta.glob<Lesson>(['../mocks/lessons/*.json', '!../mocks/lessons/index.json'], {
  import: 'default',
})

export async function getLesson(lessonId: string): Promise<Lesson> {
  const load = lessons[`../mocks/lessons/${lessonId}.json`]
  if (!load) throw new Error(`Unknown lesson: ${lessonId}`)
  return load()
}
