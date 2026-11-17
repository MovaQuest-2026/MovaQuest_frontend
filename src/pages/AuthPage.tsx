import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthError, PASSWORD_MIN_LENGTH, signIn, signUp } from '../api/auth'
import { signInWithGoogle } from '../api/googleAuth'
import { getProfile } from '../api/profile'
import { applyProfile } from '../features/account/applyProfile'
import { Segmented } from '../components/Segmented'
import { useUserStore } from '../store/useUserStore'
import type { Account } from '../types/account'

type Mode = 'signIn' | 'signUp'

/** Куди повернутися після входу: адреса, з якої нас перенаправили, інакше найновіше відео. */
function returnPath(state: unknown): string {
  const from = (state as { from?: string } | null)?.from
  return from && from.startsWith('/') && !from.startsWith('/auth') ? from : '/app'
}

export function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = returnPath(location.state)
  const account = useUserStore((s) => s.account)
  const [mode, setMode] = useState<Mode>('signUp')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Уже ввійшли: сюди не повертаємось. Сабміт сам веде далі, тож перевіряємо лише поза ним.
  if (account && !busy) return <Navigate to={returnTo} replace />

  // Спільне для пароля й Google: зберегти сесію, далі онбординг або назад до відео.
  const run = async (action: () => Promise<Account>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const acc = await action()
      const user = useUserStore.getState()
      user.setAccount(acc)
      // Онбординг одразу після реєстрації (і після першого входу через Google).
      // Якщо профіль уже є (вхід на новому пристрої), підтягуємо його й ідемо далі.
      const profile = await getProfile(acc.id)
      if (!profile) {
        // Незавершений онбординг відкриється знову, навіть якщо зараз його закрити (див. App).
        user.setOnboardingPending(true)
        navigate('/onboarding', { replace: true, state: { from: returnTo } })
        return
      }
      applyProfile(profile)
      navigate(returnTo, { replace: true })
    } catch (err) {
      // busy скидаємо лише при помилці: після успіху сторінка вже йде далі, а скинутий busy
      // увімкнув би редирект «уже ввійшли» і перебив би перехід на онбординг.
      setBusy(false)
      // Закрите вікно Google — не помилка, просто лишаємось на сторінці.
      if (err instanceof AuthError && err.code === 'googleCancelled') return
      setError(err instanceof AuthError ? t(`auth.errors.${err.code}`, { min: PASSWORD_MIN_LENGTH }) : t('app.error'))
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(() => (mode === 'signUp' ? signUp({ name, email, password }) : signIn({ email, password })))
  }

  // Вхід необов'язковий: «Не зараз» повертає туди, звідки прийшли (або до відео).
  const skip = () => navigate(returnTo, { replace: true })

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  return (
    <main className="page auth">
      <div className="stack">
        <div className="row auth__top">
          <p className="auth__brand">{t('app.name')}</p>
          <span className="spacer" />
          {/* Вхід необов'язковий: увійти можна пізніше з профілю або з підказки над відео. */}
          <button type="button" className="btn btn--ghost auth__skip" disabled={busy} onClick={skip} title={t('auth.skipHint')}>
            {t('auth.skip')}
          </button>
        </div>
        <h1 className="page__title">{t(`auth.${mode}.title`)}</h1>
        <p className="page__subtitle">{t(`auth.${mode}.subtitle`)}</p>
      </div>

      <button type="button" className="btn btn--block google-btn" disabled={busy} onClick={() => void run(signInWithGoogle)}>
        <svg className="google-btn__logo" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {t('auth.google')}
      </button>

      <p className="auth__divider" aria-hidden="true">
        <span>{t('auth.or')}</span>
      </p>

      <Segmented
        label={t('auth.modeLabel')}
        value={mode}
        options={[
          { value: 'signUp', label: t('auth.signUp.tab') },
          { value: 'signIn', label: t('auth.signIn.tab') },
        ]}
        onChange={switchMode}
      />

      <form className="stack auth__form" onSubmit={submit} noValidate>
        {mode === 'signUp' && (
          <label className="field">
            <span className="field__label">{t('auth.name')}</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              enterKeyHint="next"
              required
            />
          </label>
        )}
        <label className="field">
          <span className="field__label">{t('auth.email')}</span>
          <input
            className="input"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            required
          />
        </label>
        <label className="field">
          <span className="field__label">{t('auth.password')}</span>
          <span className="auth__password">
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              enterKeyHint="go"
              minLength={mode === 'signUp' ? PASSWORD_MIN_LENGTH : undefined}
              required
            />
            <button
              type="button"
              className="link-btn auth__toggle"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            </button>
          </span>
          {mode === 'signUp' && <span className="muted auth__hint">{t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}</span>}
        </label>

        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? t('app.loading') : t(`auth.${mode}.submit`)}
        </button>
      </form>

      <p className="muted auth__switch">
        {t(`auth.${mode}.switchPrompt`)}{' '}
        <button type="button" className="link-btn" onClick={() => switchMode(mode === 'signUp' ? 'signIn' : 'signUp')}>
          {t(`auth.${mode}.switchAction`)}
        </button>
      </p>

      <p className="muted auth__hint auth__switch">{t('auth.skipHint')}</p>
    </main>
  )
}
