import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localize } from '../../i18n/localize'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore } from '../../store/useUserStore'
import type { Choice, ChoicePhrase } from '../../types/lesson'
import type { MachineState } from './sceneMachine'
import { MicButton } from './MicButton'
import { stableShuffle } from './stableShuffle'

interface ChoicePanelProps {
  lessonId: string
  sceneId: string
  choice: Choice
  machine: MachineState
}

const TOAST_MS = 2500

export function ChoicePanel({ lessonId, sceneId, choice, machine }: ChoicePanelProps) {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const dispatch = usePlayerStore((s) => s.dispatch)
  const [toastExpired, setToastExpired] = useState(false)
  const [micDenied, setMicDenied] = useState(false)

  const busy = machine.status === 'listening' || machine.status === 'evaluating'
  const phrases = useMemo(() => stableShuffle(choice.phrases, `${lessonId}/${sceneId}`), [choice, lessonId, sceneId])
  const attempt = Math.min(machine.retryCount + 1, choice.maxRetries)

  // Фрази відкрились самі саме на цій спробі: короткий тост.
  const toastDue = machine.autoRevealed && machine.retryCount === choice.maxRetries
  useEffect(() => {
    if (!toastDue) return
    const id = window.setTimeout(() => setToastExpired(true), TOAST_MS)
    return () => window.clearTimeout(id)
  }, [toastDue])
  const toast = toastDue && !toastExpired

  const reveal = () => dispatch({ type: 'REVEAL_PHRASES' })
  const answer = (phrase: ChoicePhrase) => dispatch({ type: 'RESULT', branch: phrase.branch, source: 'tap' })

  return (
    <section className="choice-panel" aria-label={localize(choice.task, lang)}>
      {toast && (
        <p className="toast" role="status">
          {t('player.phrasesShown')}
        </p>
      )}
      <div className="row">
        <p className="choice-panel__task">{localize(choice.task, lang)}</p>
        <span className="spacer" />
        <span className="choice-panel__try">{t('player.tryOf', { current: attempt, total: choice.maxRetries })}</span>
      </div>

      <MicButton
        lessonId={lessonId}
        sceneId={sceneId}
        phrasesRevealed={machine.phrasesRevealed}
        onShowPhrases={reveal}
        onDenied={() => setMicDenied(true)}
      />

      {/* Коли мікрофон заблоковано, «Show phrases» показує пояснення в MicButton. */}
      {(!micDenied || machine.phrasesRevealed) && (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={busy}
          onClick={() => dispatch({ type: machine.phrasesRevealed ? 'HIDE_PHRASES' : 'REVEAL_PHRASES' })}
        >
          {machine.phrasesRevealed ? t('player.hidePhrases') : t('player.showPhrases')}
        </button>
      )}

      {machine.phrasesRevealed && (
        <ul className="phrase-list">
          {phrases.map((p) => (
            <li key={p.branch}>
              <button type="button" className="phrase-card" disabled={busy} onClick={() => answer(p)}>
                <span className="phrase-card__es" lang="es">
                  {p.es}
                </span>
                <span className="phrase-card__tr">{p.translation[lang]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
