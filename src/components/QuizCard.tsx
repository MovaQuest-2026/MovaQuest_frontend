import { useEffect, useState } from 'react'
import { getQuiz, type QuizConfig } from '../api/getQuiz'
import { useGameStore } from '../store/useGameStore'
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion'

interface QuizCardProps {
  quizId: string
  onAnswer: (correct: boolean, quiz: QuizConfig) => void
  onDone: () => void
}

// Вбудована вправа всередині діалогу (тег quiz:<id>).
export function QuizCard({ quizId, onAnswer, onDone }: QuizCardProps) {
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const lang = nativeLanguage ?? 'en'
  const [quiz, setQuiz] = useState<QuizConfig | null>(null)

  useEffect(() => {
    let cancelled = false
    getQuiz(quizId)
      .then((loaded) => {
        if (!cancelled) setQuiz(loaded)
      })
      .catch(() => {
        // Без вправи діалог не має застрягнути — просто продовжуємо.
        if (!cancelled) onDone()
      })
    return () => {
      cancelled = true
    }
  }, [quizId, onDone])

  if (!quiz) return <div className="quiz-card" />

  return (
    <div className="quiz-card">
      <MultipleChoiceQuestion
        prompt={quiz.prompt[lang]}
        options={quiz.options}
        correct={quiz.correct}
        onAnswer={(correct) => onAnswer(correct, quiz)}
        onNext={onDone}
      />
    </div>
  )
}
