import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getAllVocabulary } from '../api/getDialogue'
import { getLevels } from '../api/getLevels'
import { useGameStore } from '../store/useGameStore'

export function LevelCompleteScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const learnedWords = useGameStore((state) => state.learnedWords)
  const cityId = useGameStore((state) => state.cityConfig?.id)
  const [vocabulary, setVocabulary] = useState<Record<string, string>>({})
  const [levelId, setLevelId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllVocabulary(), getLevels()]).then(([entries, levels]) => {
      if (cancelled) return
      setVocabulary(entries)
      setLevelId(levels.find((level) => level.cityId === cityId)?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [cityId])

  return (
    <div className="screen journal-screen">
      <h1>{t('levelComplete.title')}</h1>
      <section className="journal-ending">
        <p>{t('levelComplete.text')}</p>
      </section>

      <section>
        <h3>{t('levelComplete.wordsTitle', { count: learnedWords.length })}</h3>
        {learnedWords.length > 0 ? (
          <ul className="journal-words">
            {learnedWords.map((word) => (
              <li key={word}>
                <strong>{word}</strong>
                {vocabulary[word] && <span> — {vocabulary[word]}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('levelComplete.noWords')}</p>
        )}
      </section>

      <div className="result-actions">
        <button type="button" onClick={() => navigate('/levels')}>
          {t('levelComplete.next')}
        </button>
        {levelId && (
          <button type="button" onClick={() => navigate(`/levels/${levelId}`)}>
            {t('levelComplete.playAgain')}
          </button>
        )}
      </div>
    </div>
  )
}
