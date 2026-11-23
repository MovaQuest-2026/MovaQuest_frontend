import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { trackSpeakModeChosen } from '../../api/analytics'
import { SPEAK_MODES, useUserStore, type SpeakMode } from '../../store/useUserStore'

const ICONS: Record<SpeakMode, string> = {
  // Мікрофон з хвилями: запис вмикається сам.
  tap: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z',
  // Палець, що натискає (Material «touch_app»).
  hold: 'M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z',
}

/**
 * Перша пауза: питаємо, як зручніше відповідати голосом. Закрити без вибору не можна,
 * вибір потім змінюється в профілі (Мікрофон). Портал у body: стрічка зсуває сторінки transform-ом.
 */
export function SpeakModeDialog() {
  const { t } = useTranslation()
  // Фокус на саме вікно, а не на першу кнопку: рамка фокуса виглядала б як уже зроблений вибір.
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialog.current?.focus()
  }, [])

  const choose = (mode: SpeakMode) => {
    useUserStore.getState().setSpeakMode(mode)
    trackSpeakModeChosen(mode, 'dialog')
  }

  return createPortal(
    <div className="dialog-backdrop dialog-backdrop--center">
      <div ref={dialog} tabIndex={-1} className="dialog speak-mode" role="dialog" aria-modal="true" aria-labelledby="speak-mode-title">
        <h2 id="speak-mode-title" className="section-title">
          {t('speakMode.title')}
        </h2>
        <p className="muted">{t('speakMode.body')}</p>
        <div className="speak-mode__options">
          {SPEAK_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className="speak-mode__option"
              onClick={() => choose(mode)}
            >
              <span className="speak-mode__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d={ICONS[mode]} />
                </svg>
              </span>
              <span className="speak-mode__text">
                <span className="speak-mode__label">{t(`speakMode.${mode}.label`)}</span>
                <span className="speak-mode__desc">{t(`speakMode.${mode}.body`)}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="field__hint">{t('speakMode.changeLater')}</p>
      </div>
    </div>,
    document.body,
  )
}
