import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getExercises, type ExerciseSet } from '../api/getExercises'
import { useGameStore } from '../store/useGameStore'
import { ResultScreen } from './ResultScreen'

interface ExerciseScreenProps {
  dialogueId: string
}

export function ExerciseScreen({ dialogueId }: ExerciseScreenProps) {
  const { t } = useTranslation()
  const addLearnedWord = useGameStore((state) => state.addLearnedWord)
  const [exercises, setExercises] = useState<ExerciseSet | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getExercises(dialogueId).then((set) => {
      if (!cancelled) setExercises(set)
    })
    return () => {
      cancelled = true
    }
  }, [dialogueId])

  if (!exercises) {
    return <div className="screen exercise-screen" />
  }

  const finished = questionIndex >= exercises.questions.length

  if (finished) {
    return <ResultScreen />
  }

  const question = exercises.questions[questionIndex]

  function handleSelect(option: string) {
    if (selectedOption) return

    setSelectedOption(option)
    if (option === question.correct) {
      addLearnedWord(question.correct)
    }
  }

  function handleNext() {
    setSelectedOption(null)
    setQuestionIndex((index) => index + 1)
  }

  return (
    <div className="screen exercise-screen">
      <p>{question.prompt}</p>

      <div className="exercise-options">
        {question.options.map((option) => {
          const isSelected = selectedOption === option
          const isCorrectOption = option === question.correct

          return (
            <button
              key={option}
              type="button"
              className={
                selectedOption
                  ? isCorrectOption
                    ? 'correct'
                    : isSelected
                      ? 'incorrect'
                      : ''
                  : ''
              }
              disabled={selectedOption !== null}
              onClick={() => handleSelect(option)}
            >
              {option}
            </button>
          )
        })}
      </div>

      {selectedOption && (
        <>
          <p className={selectedOption === question.correct ? 'correct' : 'incorrect'}>
            {selectedOption === question.correct
              ? t('exercise.correct')
              : t('exercise.incorrect')}
          </p>
          <button type="button" onClick={handleNext}>
            {t('exercise.next')}
          </button>
        </>
      )}
    </div>
  )
}
