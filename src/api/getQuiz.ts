import type { LocalizedText } from './getCityConfig'

export interface QuizConfig {
  id: string
  type: 'multiple_choice'
  prompt: LocalizedText
  options: string[]
  correct: string
  word: string
  _source?: string
}

const quizModules = import.meta.glob<{ default: QuizConfig }>(
  '../mocks/quizzes/*.json',
)

export async function getQuiz(quizId: string): Promise<QuizConfig> {
  const loadQuiz = quizModules[`../mocks/quizzes/${quizId}.json`]
  if (!loadQuiz) {
    throw new Error(`Unknown quiz: ${quizId}`)
  }
  const module = await loadQuiz()
  return module.default
}
