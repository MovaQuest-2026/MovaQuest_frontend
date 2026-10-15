import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MultipleChoiceQuestionProps {
  prompt: string
  options: string[]
  correct: string
  onAnswer: (correct: boolean) => void
  onNext: () => void
}

// Спільне питання з вибором відповіді для ExerciseScreen і QuizCard.
// Стан вибору скидається через key у батьківському компоненті.
export function MultipleChoiceQuestion({
  prompt,
  options,
  correct,
  onAnswer,
  onNext,
}: MultipleChoiceQuestionProps) {
  const { t } = useTranslation()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  function handleSelect(option: string) {
    if (selectedOption) return
    setSelectedOption(option)
    onAnswer(option === correct)
  }

  return (
    <>
      <p>{prompt}</p>

      <div className="exercise-options">
        {options.map((option) => {
          const isSelected = selectedOption === option
          const isCorrectOption = option === correct

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
          <p className={selectedOption === correct ? 'correct' : 'incorrect'}>
            {selectedOption === correct
              ? t('exercise.correct')
              : t('exercise.incorrect')}
          </p>
          <button type="button" onClick={onNext}>
            {t('exercise.next')}
          </button>
        </>
      )}
    </>
  )
}
