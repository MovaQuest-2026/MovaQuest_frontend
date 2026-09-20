export interface ExerciseQuestion {
  id: string
  type: 'multiple_choice'
  prompt: string
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

export async function getExercises(dialogueId: string): Promise<ExerciseSet> {
  const loadExercises =
    exerciseModules[`../mocks/exercises/${dialogueId}.json`]
  if (!loadExercises) {
    throw new Error(`Unknown exercise set: ${dialogueId}`)
  }
  const module = await loadExercises()
  return module.default
}
