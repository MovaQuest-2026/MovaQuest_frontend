import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getAlphaProgress, ALPHA_QUESTION_COUNT, ALPHA_STATION_COUNT } from '../store/alphaProgress'
import { useGameStore } from '../store/useGameStore'

// Модальне вікно підтвердження виходу (pendingExit): рух і джойстик вимкнені, поки воно відкрите.
export function ConfirmTravelDialog() {
  const { t } = useTranslation()
  const pendingExit = useGameStore((state) => state.pendingExit)
  const city = useGameStore((state) => state.cityConfig)
  const flags = useGameStore((state) => state.flags)
  const confirmPendingExit = useGameStore((state) => state.confirmPendingExit)
  const cancelPendingExit = useGameStore((state) => state.cancelPendingExit)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const open = pendingExit !== null

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelPendingExit()
      } else if (event.key === 'Enter') {
        // На кнопці «Ще ні» Enter натискає саму кнопку.
        if (document.activeElement === cancelRef.current) return
        event.preventDefault()
        confirmPendingExit()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, confirmPendingExit, cancelPendingExit])

  const confirm = pendingExit
    ? city?.zones
        .find((zone) => zone.id === pendingExit.zoneId)
        ?.exits.find((exit) => exit.id === pendingExit.exitId)?.confirm
    : undefined
  if (!pendingExit || !confirm) return null

  const { stationsDone, alphaScore } = getAlphaProgress(flags)

  return (
    <div className="travel-backdrop">
      <div
        className="travel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-title"
        aria-describedby="travel-body"
      >
        <h2 id="travel-title">{t(confirm.titleKey)}</h2>
        <p id="travel-body">
          {t(confirm.bodyKey, {
            done: stationsDone,
            score: alphaScore,
            total: ALPHA_STATION_COUNT,
            max: ALPHA_QUESTION_COUNT,
          })}
        </p>
        <div className="travel-actions">
          <button type="button" ref={confirmRef} onClick={confirmPendingExit}>
            {t(confirm.confirmKey)}
          </button>
          <button type="button" ref={cancelRef} onClick={cancelPendingExit}>
            {t(confirm.cancelKey)}
          </button>
        </div>
      </div>
    </div>
  )
}
