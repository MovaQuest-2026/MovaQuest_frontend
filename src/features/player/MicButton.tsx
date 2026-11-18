import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { trackMicDenied } from '../../api/analytics'
import { evaluateAnswer, SpeechError } from '../../api/evaluateAnswer'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore } from '../../store/useUserStore'
import { isMicAlreadyAllowed } from '../speech/microphone'
import { useSpeechCapture } from '../speech/useSpeechCapture'

export type MicUiState = 'idle' | 'requestingPermission' | 'listening' | 'evaluating' | 'denied' | 'error'

/** Коротка затримка перед автозаписом: панель встигає з'явитися, а звук відео стихнути. */
const AUTO_START_DELAY_MS = 350

interface MicButtonProps {
  lessonId: string
  gapId: string
  disabled?: boolean
  /**
   * Почати запис самому, щойно кнопка з'явилась. Лише якщо дозвіл на мікрофон уже є:
   * діалог браузера без пояснення не показуємо, тоді чекаємо дотику.
   */
  autoStart?: boolean
  /** Кнопки обабіч кружка (зліва «Ще раз», справа «Пропустити»). */
  start?: ReactNode
  end?: ReactNode
  onDenied?: () => void
  /** Гостю голос недоступний (потрібна сесія): панель переходить на ввід текстом. */
  onSignInRequired?: () => void
}

// Дотик починає запис, повторний дотик або 1.5 с тиші зупиняє.
export function MicButton({ lessonId, gapId, disabled, autoStart, start, end, onDenied, onSignInRequired }: MicButtonProps) {
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
        trackMicDenied(lessonId, gapId)
        onDenied?.()
      }
    }
  }, [capture.state, denied, dispatch, setMicPermission, onDenied, lessonId, gapId])

  const record = async () => {
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
      const result = await evaluateAnswer(lessonId, gapId, blob)
      dispatch({ type: 'RESULT', verdict: result.verdict, heard: result.transcript, source: 'voice' })
    } catch (err) {
      if (err instanceof SpeechError && err.code === 'signInRequired') onSignInRequired?.()
      setFailed(true)
      dispatch({ type: 'CANCEL_LISTENING' })
    } finally {
      setEvaluating(false)
    }
  }

  const onTap = () => {
    if (uiState === 'listening') {
      capture.stop()
      return
    }
    if (uiState === 'requestingPermission' || uiState === 'evaluating') return
    void record()
  }

  // Слово з'явилось: одразу слухаємо, без дотику. Один раз на появу кнопки.
  const recordRef = useRef(record)
  useEffect(() => {
    recordRef.current = record
  })
  useEffect(() => {
    if (!autoStart) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      const allowed = await isMicAlreadyAllowed(useUserStore.getState().micPermission === 'granted')
      if (!cancelled && allowed) void recordRef.current()
    }, AUTO_START_DELAY_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [autoStart])

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
      <div className="mic__row">
        <div className="mic__side mic__side--start">{start}</div>
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
        <div className="mic__side mic__side--end">{end}</div>
      </div>
      <p className="mic__label" aria-live="polite">
        {label}
      </p>
      {uiState === 'denied' && <p className="notice notice--error mic__notice">{t('player.micDenied')}</p>}
      {uiState === 'error' && <p className="notice notice--error mic__notice">{t('player.micError')}</p>}
    </div>
  )
}
