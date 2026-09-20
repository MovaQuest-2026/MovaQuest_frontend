import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getNextReviewWords } from '../api/getNextReviewWords'
import { useGameStore } from '../store/useGameStore'

export function ResultScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const learnedWords = useGameStore((state) => state.learnedWords)
  const setActiveExercise = useGameStore((state) => state.setActiveExercise)
  const [reviewWords, setReviewWords] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    getNextReviewWords(learnedWords).then((words) => {
      if (!cancelled) setReviewWords(words)
    })
    return () => {
      cancelled = true
    }
  }, [learnedWords])

  function handleGoHome() {
    setActiveExercise(null)
    navigate('/')
  }

  return (
    <div className="screen result-screen">
      <h1>{t('result.title')}</h1>
      <p>{t('result.learnedCount', { count: learnedWords.length })}</p>

      {reviewWords.length > 0 && (
        <>
          <h2>{t('result.reviewTitle')}</h2>
          <ul>
            {reviewWords.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        </>
      )}

      <button type="button" onClick={handleGoHome}>
        {t('result.goHome')}
      </button>
    </div>
  )
}
