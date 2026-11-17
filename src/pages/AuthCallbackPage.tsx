import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthError, getCurrentAccount, type AuthErrorCode } from '../api/auth'
import { googleErrorFromQuery, takePendingGoogleSignIn } from '../api/googleAuth'
import { completeSignIn, safeReturnPath } from '../features/account/completeSignIn'

/**
 * Сюди бекенд повертає після входу через Google (cookie сесії вже стоїть).
 * Читаємо акаунт і далі як після звичайного входу: онбординг або назад до відео.
 */
export function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // StrictMode запускає ефект двічі, а позначку входу можна взяти лише раз.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const pending = takePendingGoogleSignIn()
    const returnTo = safeReturnPath(pending?.returnTo)
    const fail = (authError: AuthErrorCode) => navigate('/auth', { replace: true, state: { from: returnTo, authError } })

    const error = params.get('error')
    if (error) {
      fail(googleErrorFromQuery(error).code)
      return
    }
    getCurrentAccount()
      .then((account) => (account ? completeSignIn(account, returnTo, navigate) : fail('googleFailed')))
      .catch((err: unknown) => fail(err instanceof AuthError ? err.code : 'serverUnavailable'))
  }, [navigate, params])

  return (
    <main className="page auth">
      <p className="muted" role="status">
        {t('auth.callback')}
      </p>
    </main>
  )
}
