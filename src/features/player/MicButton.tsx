import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { evaluateSpeech } from '../../api/evaluateSpeech'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore } from '../../store/useUserStore'
import { useSpeechCapture } from '../speech/useSpeechCapture'

export type MicUiState = 'idle' | 'requestingPermission' | 'listening' | 'evaluating' | 'denied' | 'error'

interface MicButtonProps {
  lessonId: string
  sceneId: string
  disabled?: boolean
  phrasesRevealed: boolean
  onShowPhrases: () => void
  onDenied?: () => void
}

// Дотик починає запис, повторний дотик або 1.5 с тиші зупиняє.
export function MicButton({ lessonId, sceneId, disabled, phrasesRevealed, onShowPhrases, onDenied }: MicButtonProps) {
  const { t } = useTranslation()
  const capture = useSpeechCapture()
  const [evaluating, setEvaluating] = useState(false)
  const [failed, setFailed] = useState(false)
  const dispatch = usePlayerStore((s) => s.dispatch)
  const setMicPermission = useUserStore((s) => s.setMicPermission)
  const deniedReported = useRef(false)

  const denied = capture.state === 'denied' || capture.state === 'unsupported'
  const uiState: MicUiState = evaluating
    ? 'evaluating'
    : capture.state === 'recording'
      ? 'listening'
      : capture.state === 'requesting'
        ? 'requestingPermission'
        : denied
          ? 'denied'
          : capture.state === 'error' || failed
            ? 'error'
            : 'idle'

  useEffect(() => {
    if (capture.state === 'recording') dispatch({ type: 'START_LISTENING' })
    if (denied) {
      setMicPermission(capture.state === 'denied' ? 'denied' : 'unsupported')
      if (!deniedReported.current) {
        deniedReported.current = true
        onDenied?.()
      }
    }
  }, [capture.state, denied, dispatch, setMicPermission, onDenied])

  const onTap = async () => {
    if (uiState === 'listening') {
      capture.stop()
      return
    }
    if (uiState === 'requestingPermission' || uiState === 'evaluating') return
    setFailed(false)
    const blob = await capture.start()
    if (!blob) {
      dispatch({ type: 'CANCEL_LISTENING' })
      return
    }
    setMicPermission('granted')
    dispatch({ type: 'STOP_LISTENING' })
    setEvaluating(true)
    try {
      const result = await evaluateSpeech(lessonId, sceneId, blob)
      dispatch({ type: 'RESULT', branch: result.branch, source: 'voice' })
    } catch {
      setFailed(true)
      dispatch({ type: 'CANCEL_LISTENING' })
    } finally {
      setEvaluating(false)
    }
  }

  const label =
    uiState === 'listening'
      ? t('player.stop')
      : uiState === 'evaluating'
        ? t('player.listening')
        : uiState === 'requestingPermission'
          ? t('onboarding.mic.requesting')
          : t('player.speak')

  return (
    <div className="mic">
      <button
        type="button"
        className={`mic__button mic__button--${uiState}`}
        aria-label={label}
        aria-pressed={uiState === 'listening'}
        disabled={disabled || uiState === 'evaluating' || uiState === 'requestingPermission'}
        onClick={onTap}
        style={{ '--level': capture.level } as CSSProperties}
      >
        <span className="mic__ring" aria-hidden="true" />
        <svg className="mic__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
          />
        </svg>
      </button>
      <p className="mic__label" aria-live="polite">
        {label}
      </p>
      {uiState === 'denied' && (
        <div className="notice notice--error mic__notice">
          <p>{t('player.micDenied')}</p>
          {!phrasesRevealed && (
            <button type="button" className="btn btn--block" onClick={onShowPhrases}>
              {t('player.showPhrases')}
            </button>
          )}
        </div>
      )}
      {uiState === 'error' && <p className="notice notice--error mic__notice">{t('player.micError')}</p>}
    </div>
  )
}
