import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { evaluateTypedAnswer } from '../../api/evaluateAnswer'
import { translate } from '../../i18n/localize'
import { answerHint } from '../../lib/matchAnswer'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore } from '../../store/useUserStore'
import type { Gap } from '../../types/lesson'
import type { MachineState } from './gapMachine'
import { MicButton } from './MicButton'

interface GapPanelProps {
  lessonId: string
  gap: Gap
  machine: MachineState
  onReplay: () => void
}

/** Після правильної відповіді відео продовжується саме. */
const AUTO_CONTINUE_MS = 1400

export function GapPanel({ lessonId, gap, machine, onReplay }: GapPanelProps) {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const dispatch = usePlayerStore((s) => s.dispatch)
  // Якщо мікрофон уже заборонений, одразу пропонуємо ввести відповідь текстом.
  const [typing, setTyping] = useState(() => {
    const permission = useUserStore.getState().micPermission
    return permission === 'denied' || permission === 'unsupported'
  })
  const [micDenied, setMicDenied] = useState(false)
  const [text, setText] = useState('')

  const busy = machine.status === 'listening' || machine.status === 'evaluating'
  const result = machine.status === 'feedback' ? machine.results[machine.results.length - 1] : null

  useEffect(() => {
    if (result?.resolution !== 'correct') return
    const id = window.setTimeout(() => dispatch({ type: 'CONTINUE' }), AUTO_CONTINUE_MS)
    return () => window.clearTimeout(id)
  }, [result, dispatch])

  const submitText = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    dispatch({ type: 'RESULT', verdict: evaluateTypedAnswer(gap, text), heard: text, source: 'text' })
    setText('')
  }

  const translation = translate(gap.translation, lang)

  if (result) {
    const correct = result.resolution === 'correct'
    return (
      <section className={`gap-panel gap-panel--${correct ? 'correct' : 'revealed'}`} aria-live="polite">
        <p className="gap-panel__verdict">{t(`player.resolution.${result.resolution}`)}</p>
        <p className="gap-panel__answer" lang="es">
          {gap.answer}
        </p>
        {translation && <p className="gap-panel__translation">{translation}</p>}
        <button type="button" className="btn btn--primary btn--block" onClick={() => dispatch({ type: 'CONTINUE' })}>
          ▶ {t('player.continue')}
        </button>
      </section>
    )
  }

  const lastHeard = machine.heard[machine.heard.length - 1]
  // repeat: слово вже прозвучало, тож підказка відкрита одразу.
  const hintShown = machine.hintShown || gap.kind === 'repeat'
  const promptTranslation = gap.kind === 'repeat' || gap.showTranslation ? translation : null
  const showTyping = typing || micDenied

  return (
    <section className="gap-panel" aria-label={t(`player.gapKind.${gap.kind}`)}>
      <div className="row">
        <p className="gap-panel__task">{t(`player.gapKind.${gap.kind}`)}</p>
        <span className="spacer" />
        <span className="gap-panel__try">
          {t('player.tryOf', { current: Math.min(machine.attempts + 1, gap.maxAttempts), total: gap.maxAttempts })}
        </span>
      </div>

      <p className="gap-panel__context" lang="es">
        {gap.context}{' '}
        <span className="gap-panel__blank">{hintShown ? answerHint(gap.answer) : '_____'}</span>
      </p>
      {promptTranslation && <p className="gap-panel__prompt">{promptTranslation}</p>}

      {machine.lastVerdict === 'wrong' && (
        <p className="gap-panel__feedback gap-panel__feedback--wrong" role="status">
          {lastHeard ? t('player.wrongHeard', { heard: lastHeard }) : t('player.wrong')}
        </p>
      )}
      {machine.lastVerdict === 'unclear' && (
        <p className="gap-panel__feedback" role="status">
          {t('player.unclear')}
        </p>
      )}

      {!showTyping && <MicButton lessonId={lessonId} gapId={gap.id} onDenied={() => setMicDenied(true)} />}

      {showTyping && (
        <form className="gap-panel__form" onSubmit={submitText}>
          <input
            className="input"
            lang="es"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('player.typePlaceholder')}
            aria-label={t('player.typePlaceholder')}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            autoFocus
          />
          <button type="submit" className="btn btn--primary" disabled={!text.trim()}>
            {t('player.check')}
          </button>
        </form>
      )}

      <div className="gap-panel__actions">
        <button type="button" className="btn btn--ghost" disabled={busy || hintShown} onClick={() => dispatch({ type: 'SHOW_HINT' })}>
          {t('player.hint')}
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onReplay}>
          ↺ {t('player.replay')}
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => dispatch({ type: 'SKIP' })}>
          {t('player.skip')}
        </button>
      </div>

      {!micDenied && (
        <button type="button" className="link-btn" disabled={busy} onClick={() => setTyping((v) => !v)}>
          {typing ? t('player.speakInstead') : t('player.typeInstead')}
        </button>
      )}
    </section>
  )
}
