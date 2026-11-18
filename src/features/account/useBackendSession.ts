import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getCurrentAccount } from '../../api/auth'
import { googleErrorFromQuery, takePendingGoogleSignIn } from '../../api/googleAuth'
import { wakeBackend } from '../../api/http'
import { useUserStore } from '../../store/useUserStore'

/** Безкоштовний Render засинає після ~15 хв тиші: поки вкладка видима, торкаємось його частіше. */
const KEEP_AWAKE_MS = 10 * 60_000

/** Звіряє локальний account з cookie сесії на бекенді. Мережеві збої нічого не міняють. */
async function syncSession() {
  let remote
  try {
    remote = await getCurrentAccount()
  } catch {
    return
  }
  const user = useUserStore.getState()
  if (remote === null) {
    // Сесія закінчилась (або це старий локальний мок-акаунт): далі як гість.
    if (user.account) {
      user.setAccount(null)
      user.setOnboardingPending(false)
    }
    return
  }
  const local = user.account
  if (!local || local.id !== remote.id || local.name !== remote.name || local.email !== remote.email) user.setAccount(remote)
}

/**
 * Під час запуску (на будь-якій сторінці, зокрема на лендінгу): розбудити Render через GET /health
 * і перевірити сесію (GET /users/me), поки людина дивиться перші секунди.
 * Далі ті самі запити кожні ~10 хв, поки вкладка видима (docs/backend-plan.md §2.4).
 */
export function useBackendSession() {
  useEffect(() => {
    let last = 0
    const tick = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < KEEP_AWAKE_MS - 5_000) return
      last = Date.now()
      wakeBackend()
      void syncSession()
    }
    tick()
    const timer = window.setInterval(tick, KEEP_AWAKE_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
}

/**
 * Невдалий Google-вхід бекенд повертає не на /auth/callback, а на корінь сайту з ?error=<код>.
 * Якщо вхід почали в цій вкладці, показуємо помилку на /auth, а не лендінг.
 */
export function useGoogleErrorReturn() {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (location.pathname !== '/') return
    const error = new URLSearchParams(location.search).get('error')
    if (!error) return
    const pending = takePendingGoogleSignIn()
    if (!pending) return
    navigate('/auth', { replace: true, state: { from: pending.returnTo, authError: googleErrorFromQuery(error).code } })
  }, [location.pathname, location.search, navigate])
}
