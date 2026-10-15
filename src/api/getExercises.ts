export interface ExerciseQuestion {
  id: string
  type: 'multiple_choice'
  prompt: { en: string; uk: string }
  options: string[]
  correct: string
}

export interface ExerciseSet {
  dialogueId: string
  questions: ExerciseQuestion[]
}

const exerciseModules = import.meta.glob<{ default: ExerciseSet }>(
  '../mocks/exercises/*.json',
)

// Вправи після діалогу необов'язкові: якщо набору немає, повертаємо null, а не помилку.
export async function getExercises(
  dialogueId: string,
): Promise<ExerciseSet | null> {
  const loadExercises =
    exerciseModules[`../mocks/exercises/${dialogueId}.json`]
  if (!loadExercises) return null
  const module = await loadExercises()
  return module.default
}
