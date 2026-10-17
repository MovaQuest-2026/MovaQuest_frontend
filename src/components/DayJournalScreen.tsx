import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getAllVocabulary } from '../api/getDialogue'
import { useGameStore } from '../store/useGameStore'

const ENDINGS = ['best', 'good', 'basic'] as const

// Прапорець допомоги → NPC, якому гравець допоміг.
const HELPED_NPCS: [flag: string, npcId: string][] = [
  ['helped_nina', 'npc_nina'],
  ['helped_tourist', 'npc_tourist'],
  ['knows_pirogov', 'npc_ostap'],
  ['has_drawing', 'npc_artist'],
]

export function DayJournalScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const flags = useGameStore((state) => state.flags)
  const learnedWords = useGameStore((state) => state.learnedWords)
  const cityConfig = useGameStore((state) => state.cityConfig)
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const resetProgress = useGameStore((state) => state.resetProgress)
  const lang = nativeLanguage ?? 'en'
  const [vocabulary, setVocabulary] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    getAllVocabulary().then((entries) => {
      if (!cancelled) setVocabulary(entries)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const ending = ENDINGS.find((candidate) => candidate === flags.ending) ?? 'basic'
  const npcs = cityConfig?.zones.flatMap((zone) => zone.npcs) ?? []
  const helped = HELPED_NPCS.filter(([flag]) => flags[flag] === true).map(
    ([flag, npcId]) => ({
      flag,
      name: npcs.find((npc) => npc.id === npcId)?.name[lang] ?? npcId,
    }),
  )

  function handlePlayAgain() {
    resetProgress()
    navigate('/language')
  }

  return (
    <div className="screen journal-screen">
      <h1>{t('journal.title')}</h1>
      <section className="journal-ending">
        <h2>{t(`journal.ending.${ending}.title`)}</h2>
        <p>{t(`journal.ending.${ending}.text`)}</p>
      </section>

      <section>
        <h3>{t('journal.wordsTitle', { count: learnedWords.length })}</h3>
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
          <p>{t('journal.noWords')}</p>
        )}
      </section>

      <section>
        <h3>{t('journal.helpedTitle')}</h3>
        {helped.length > 0 ? (
          <ul className="journal-helped">
            {helped.map(({ flag, name }) => (
              <li key={flag}>{t(`journal.helped.${flag}`, { name })}</li>
            ))}
          </ul>
        ) : (
          <p>{t('journal.noHelped')}</p>
        )}
      </section>

      <div className="result-actions">
        <button type="button" onClick={handlePlayAgain}>
          {t('journal.playAgain')}
        </button>
        <button type="button" onClick={() => navigate('/play')}>
          {t('journal.mainMenu')}
        </button>
      </div>
    </div>
  )
}
