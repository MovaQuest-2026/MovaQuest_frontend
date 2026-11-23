import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { trackMicDenied } from '../../api/analytics'
import { evaluateAnswer, SpeechError } from '../../api/evaluateAnswer'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore, type SpeakMode } from '../../store/useUserStore'
import { isMicAlreadyAllowed } from '../speech/microphone'
import { useSpeechCapture } from '../speech/useSpeechCapture'

export type MicUiState = 'idle' | 'requestingPermission' | 'listening' | 'evaluating' | 'denied' | 'error'

/** Коротка затримка перед автозаписом: панель встигає з'явитися, а звук відео стихнути. */
const AUTO_START_DELAY_MS = 350
/** Коротший дотик у режимі hold вважаємо випадковим: запис скасовуємо й підказуємо тримати кнопку. */
const MIN_HOLD_MS = 300

interface MicButtonProps {
  lessonId: string
  gapId: string
  /** tap: дотик починає й зупиняє запис (тиша теж зупиняє); hold: запис, поки кнопку тримають. */
  mode?: SpeakMode
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

// tap: дотик починає запис, повторний дотик або 1.5 с тиші зупиняє.
// hold: натиснув — запис, відпустив — перевірка; тиша запис не зупиняє.
export function MicButton({ lessonId, gapId, mode = 'tap', disabled, autoStart, start, end, onDenied, onSignInRequired }: MicButtonProps) {
  const { t } = useTranslation()
  const capture = useSpeechCapture()
  const [evaluating, setEvaluating] = useState(false)
  const [failed, setFailed] = useState(false)
  const dispatch = usePlayerStore((s) => s.dispatch)
  const setMicPermission = useUserStore((s) => s.setMicPermission)
  const deniedReported = useRef(false)
  const hold = mode === 'hold'
  const pressedAt = useRef<number | null>(null)
  const [tooShort, setTooShort] = useState(false)

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
    const blob = await capture.start({ autoStop: !hold })
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

  const press = () => {
    if (pressedAt.current !== null || uiState === 'requestingPermission' || uiState === 'evaluating') return
    pressedAt.current = performance.now()
    setTooShort(false)
    void record()
  }

  // Відпустили раніше, ніж запис почався (наприклад, відкрився діалог дозволу), — запис скасовується.
  const release = () => {
    if (pressedAt.current === null) return
    const heldFor = performance.now() - pressedAt.current
    pressedAt.current = null
    if (heldFor < MIN_HOLD_MS) {
      capture.cancel()
      setTooShort(true)
    } else {
      capture.stop()
    }
  }

  const holdHandlers = {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      // Палець може з'їхати з кнопки: подія відпускання все одно прийде сюди.
      e.currentTarget.setPointerCapture?.(e.pointerId)
      press()
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    // Довгий дотик на Android інакше відкриває контекстне меню.
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault()
        press()
      }
    },
    onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        release()
      }
    },
    onBlur: release,
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
      ? t(hold ? 'player.releaseToCheck' : 'player.stop')
      : uiState === 'evaluating'
        ? t('player.listening')
        : uiState === 'requestingPermission'
          ? t('onboarding.mic.requesting')
          : t(hold ? (tooShort ? 'player.holdLonger' : 'player.holdToSpeak') : 'player.speak')

  return (
    <div className="mic">
      <div className="mic__row">
        <div className="mic__side mic__side--start">{start}</div>
        <button
          type="button"
          className={`mic__button mic__button--${uiState}${hold ? ' mic__button--hold' : ''}`}
          aria-label={label}
          aria-pressed={uiState === 'listening'}
          // hold: під час запиту дозволу кнопка лишається активною, щоб відпускання дійшло й скасувало запис.
          disabled={disabled || uiState === 'evaluating' || (!hold && uiState === 'requestingPermission')}
          {...(hold ? holdHandlers : { onClick: onTap })}
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
