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
import { SpeakModeDialog } from './SpeakModeDialog'

interface GapPanelProps {
  lessonId: string
  gap: Gap
  machine: MachineState
  onReplay: () => void
  /** Відповісти на цю паузу ще раз (після показаної або пропущеної відповіді). */
  onRetry: () => void
}

/** Після правильної відповіді відео продовжується саме. */
const AUTO_CONTINUE_MS = 1400

export function GapPanel({ lessonId, gap, machine, onReplay, onRetry }: GapPanelProps) {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  // null: ще не питали, як відповідати голосом; поки не виберуть, запис сам не вмикається.
  const speakMode = useUserStore((s) => s.speakMode)
  const dispatch = usePlayerStore((s) => s.dispatch)
  // Якщо мікрофон уже заборонений, одразу пропонуємо ввести відповідь текстом.
  const [typing, setTyping] = useState(() => {
    const permission = useUserStore.getState().micPermission
    return permission === 'denied' || permission === 'unsupported'
  })
  const [micDenied, setMicDenied] = useState(false)
  // Якщо бекенд знову вимагатиме сесію для розпізнавання (401), пропонуємо увійти або писати текстом.
  const [signInNeeded, setSignInNeeded] = useState(false)
  const [text, setText] = useState('')

  // Поки запис іде, усе лишається доступним: «Ще раз», «Пропустити» чи текст просто скасовують запис.
  const evaluating = machine.status === 'evaluating'
  // Результат повтору слова показуємо тут, але до підсумку він не потрапляє (див. practiceResult у gapMachine).
  const result = machine.status === 'feedback' ? (machine.practiceResult ?? machine.results[machine.results.length - 1]) : null

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
        {!correct && result.heard.length > 0 && (
          <p className="gap-panel__heard">{t('result.youSaid', { heard: result.heard.join(', ') })}</p>
        )}
        <button type="button" className="btn btn--primary btn--block" onClick={() => dispatch({ type: 'CONTINUE' })}>
          ▶ {t('player.continue')}
        </button>
        {!correct && (
          <button type="button" className="btn btn--ghost btn--block" onClick={onRetry}>
            ↺ {t('player.reviewGap.retryButton')}
          </button>
        )}
      </section>
    )
  }

  const lastHeard = machine.heard[machine.heard.length - 1]
  // repeat: слово вже прозвучало, тож підказка відкрита одразу.
  const hintShown = machine.hintShown || gap.kind === 'repeat'
  const promptTranslation = gap.kind === 'repeat' || gap.showTranslation ? translation : null
  const showTyping = typing || micDenied

  const replayButton = (
    <button
      type="button"
      className="icon-btn gap-panel__side-btn"
      disabled={evaluating}
      onClick={() => {
        // REPLAY працює лише з очікування відповіді: спершу зупиняємо запис, панель зникне й обірве його.
        dispatch({ type: 'CANCEL_LISTENING' })
        onReplay()
      }}
      aria-label={t('player.replay')}
      title={t('player.replay')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z"
        />
      </svg>
    </button>
  )
  const skipButton = (
    <button
      type="button"
      className="icon-btn gap-panel__side-btn"
      onClick={() => dispatch({ type: 'SKIP' })}
      aria-label={t('player.skip')}
      title={t('player.skip')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M6 5.5v13a.75.75 0 0 0 1.14.64l10-6.5a.75.75 0 0 0 0-1.28l-10-6.5A.75.75 0 0 0 6 5.5ZM17 5h2v14h-2z" />
      </svg>
    </button>
  )

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

      {showTyping ? (
        <div className="mic__row">
          <div className="mic__side mic__side--start">{replayButton}</div>
          <span className="mic__gap" aria-hidden="true" />
          <div className="mic__side mic__side--end">{skipButton}</div>
        </div>
      ) : (
        <MicButton
          lessonId={lessonId}
          gapId={gap.id}
          mode={speakMode ?? 'tap'}
          autoStart={speakMode === 'tap'}
          start={replayButton}
          end={skipButton}
          onDenied={() => setMicDenied(true)}
          onSignInRequired={() => setSignInNeeded(true)}
        />
      )}

      {!showTyping && speakMode === null && <SpeakModeDialog />}

      {signInNeeded && (
        <p className="notice mic__notice" role="status">
          {t('player.voiceSignIn')}
        </p>
      )}

      <div className="gap-panel__actions">
        <button
          type="button"
          className="icon-btn gap-panel__side-btn gap-panel__hint-btn"
          disabled={evaluating || hintShown}
          onClick={() => dispatch({ type: 'SHOW_HINT' })}
          aria-label={t('player.hint')}
          title={t('player.hint')}
        >
          ?
        </button>
        {!micDenied && (
          <button
            type="button"
            className="icon-btn gap-panel__side-btn"
            disabled={evaluating}
            onClick={() => setTyping((v) => !v)}
            aria-label={typing ? t('player.speakInstead') : t('player.typeInstead')}
            title={typing ? t('player.speakInstead') : t('player.typeInstead')}
          >
            {typing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v10h16V7H4Zm2 2h2v2H6V9Zm3 0h2v2H9V9Zm3 0h2v2h-2V9Zm3 0h3v2h-3V9ZM6 12h2v2H6v-2Zm3 0h6v2H9v-2Zm7 0h2v2h-2v-2Z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </section>
  )
}
