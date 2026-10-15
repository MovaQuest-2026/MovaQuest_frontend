import { useEffect, useState } from 'react'
import { getExercises, type ExerciseSet } from '../api/getExercises'
import { trackExerciseAnswered } from '../api/analytics'
import { useGameStore } from '../store/useGameStore'
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion'
import { ResultScreen } from './ResultScreen'

interface ExerciseScreenProps {
  dialogueId: string
}

export function ExerciseScreen({ dialogueId }: ExerciseScreenProps) {
  const addLearnedWord = useGameStore((state) => state.addLearnedWord)
  const setActiveExercise = useGameStore((state) => state.setActiveExercise)
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const lang = nativeLanguage ?? 'en'
  const [exercises, setExercises] = useState<ExerciseSet | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    getExercises(dialogueId).then((set) => {
      if (cancelled) return
      // Не в кожного діалогу є набір вправ — тоді одразу повертаємось у світ.
      if (set) setExercises(set)
      else setActiveExercise(null)
    })
    return () => {
      cancelled = true
    }
  }, [dialogueId, setActiveExercise])

  if (!exercises) {
    return <div className="screen exercise-screen" />
  }

  const finished = questionIndex >= exercises.questions.length

  if (finished) {
    return (
      <ResultScreen
        dialogueId={dialogueId}
        score={correctCount / exercises.questions.length}
      />
    )
  }

  const question = exercises.questions[questionIndex]

  function handleAnswer(correct: boolean) {
    trackExerciseAnswered(question.id, correct)
    if (correct) {
      setCorrectCount((count) => count + 1)
      addLearnedWord(question.correct)
    }
  }

  return (
    <div className="screen exercise-screen">
      <MultipleChoiceQuestion
        key={question.id}
        prompt={question.prompt[lang]}
        options={question.options}
        correct={question.correct}
        onAnswer={handleAnswer}
        onNext={() => setQuestionIndex((index) => index + 1)}
      />
    </div>
  )
}
