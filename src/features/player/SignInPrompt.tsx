import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '../../store/useUserStore'

/** Підказка з'являється не одразу, а коли відео вже трохи пограло. */
const SHOW_AFTER_MS = 4000

interface SignInPromptProps {
  /** Чи можна показати зараз (не на паузі для відповіді, не під шторкою, звук уже ввімкнено). */
  allowed: boolean
}

/** Пропозиція увійти над відео. Закрита один раз — більше не показується. */
export function SignInPrompt({ allowed }: SignInPromptProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const signedIn = useUserStore((s) => s.account !== null)
  const dismissed = useUserStore((s) => s.signInPromptDismissed)
  const [due, setDue] = useState(false)

  const eligible = !signedIn && !dismissed
  useEffect(() => {
    if (!eligible) return
    const id = window.setTimeout(() => setDue(true), SHOW_AFTER_MS)
    return () => window.clearTimeout(id)
  }, [eligible])

  if (!eligible || !due || !allowed) return null

  return (
    <aside className="signin-prompt" aria-label={t('auth.prompt.text')}>
      <p className="signin-prompt__text">{t('auth.prompt.text')}</p>
      <button
        type="button"
        className="btn btn--primary signin-prompt__action"
        onClick={() => navigate('/auth', { state: { from: pathname } })}
      >
        {t('auth.signInCta')}
      </button>
      <button
        type="button"
        className="signin-prompt__close"
        aria-label={t('app.close')}
        onClick={() => useUserStore.getState().dismissSignInPrompt()}
      >
        ✕
      </button>
    </aside>
  )
}
