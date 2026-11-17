import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getProfile, saveProfile } from '../api/profile'
import { applyProfile } from '../features/account/applyProfile'
import { useTranslation } from 'react-i18next'
import { Segmented } from '../components/Segmented'
import { requestMicAccess } from '../features/speech/microphone'
import { SUPPORTED_LANGUAGES } from '../i18n'
import { useUserStore, type Level, type MicPermission } from '../store/useUserStore'

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']
const TOTAL_STEPS = 3

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Куди повернутися після онбордингу (state.from), інакше найновіше відео.
  const from = (useLocation().state as { from?: string } | null)?.from
  const [step, setStep] = useState(1)
  const [requesting, setRequesting] = useState(false)

  const lang = useUserStore((s) => s.interfaceLanguage)
  const level = useUserStore((s) => s.level)
  const goal = useUserStore((s) => s.goal)
  const mic = useUserStore((s) => s.micPermission)
  const { setInterfaceLanguage, setLevel, setGoal, setMicPermission, completeOnboarding } =
    useUserStore.getState()

  const account = useUserStore((s) => s.account)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  // Відповіді онбордингу йдуть у профіль акаунта (майбутня таблиця profiles, див. src/api/profile.ts).
  // Дозвіл на мікрофон лишається на пристрої.
  const finish = async (permission?: MicPermission) => {
    if (permission) setMicPermission(permission)
    if (!account || saving) return
    setSaving(true)
    setSaveFailed(false)
    try {
      await saveProfile(account.id, { interfaceLanguage: lang, level, goal })
    } catch {
      setSaveFailed(true)
      setSaving(false)
      return
    }
    completeOnboarding()
    useUserStore.getState().setOnboardingPending(false)
    navigate(from?.startsWith('/') ? from : '/app', { replace: true })
  }

  // Онбординг уже завершили (наприклад, на іншому пристрої): беремо профіль і йдемо далі.
  const accountId = account?.id
  useEffect(() => {
    if (!accountId) return
    let cancelled = false
    getProfile(accountId)
      .then((profile) => {
        if (cancelled || !profile) return
        applyProfile(profile)
        navigate(from?.startsWith('/') ? from : '/app', { replace: true })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [accountId, from, navigate])

  // Онбординг іде після реєстрації: без акаунта спершу вхід.
  if (!account) return <Navigate to="/auth" replace state={{ from }} />

  const allowMic = async () => {
    setRequesting(true)
    const result = await requestMicAccess()
    setRequesting(false)
    setMicPermission(result === 'error' ? 'denied' : result)
  }

  const micAnswered = mic === 'granted' || mic === 'denied' || mic === 'unsupported'

  return (
    <main className="page">
      <div className="stack">
        <div className="steps" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} className={`steps__dot${i < step ? ' steps__dot--active' : ''}`} />
          ))}
        </div>
        <p className="muted">{t('onboarding.stepOf', { step, total: TOTAL_STEPS })}</p>
      </div>

      {step === 1 && (
        <section className="stack">
          <h1 className="page__title">{t('onboarding.language.title')}</h1>
          <p className="page__subtitle">{t('onboarding.language.subtitle')}</p>
          <Segmented
            label={t('onboarding.language.title')}
            compact
            value={lang}
            options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`languages.${l}`) }))}
            onChange={setInterfaceLanguage}
          />
        </section>
      )}

      {step === 2 && (
        <section className="stack">
          <h1 className="page__title">{t('onboarding.level.title')}</h1>
          <p className="page__subtitle">{t('onboarding.level.subtitle')}</p>
          <div className="stack">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className="segmented__item"
                aria-pressed={l === level}
                onClick={() => setLevel(l)}
              >
                {t(`levels.${l}`)}
              </button>
            ))}
          </div>
          <label className="field">
            <span className="field__label">{t('onboarding.level.goalLabel')}</span>
            <input
              className="input"
              value={goal}
              maxLength={120}
              placeholder={t('onboarding.level.goalPlaceholder')}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>
        </section>
      )}

      {step === 3 && (
        <section className="stack">
          <h1 className="page__title">{t('onboarding.mic.title')}</h1>
          <p className="page__subtitle">{t('onboarding.mic.body')}</p>
          {requesting && <p className="notice">{t('onboarding.mic.requesting')}</p>}
          {!requesting && mic === 'granted' && <p className="notice notice--ok">{t('onboarding.mic.granted')}</p>}
          {!requesting && mic === 'denied' && <p className="notice notice--error">{t('onboarding.mic.denied')}</p>}
          {!requesting && mic === 'unsupported' && (
            <p className="notice notice--error">{t('onboarding.mic.unsupported')}</p>
          )}
        </section>
      )}

      <div className="onboarding__footer">
        {step < TOTAL_STEPS && (
          <button type="button" className="btn btn--primary btn--block" onClick={() => setStep(step + 1)}>
            {t('onboarding.next')}
          </button>
        )}
        {step === TOTAL_STEPS && !micAnswered && (
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={requesting}
              onClick={allowMic}
            >
              {t('onboarding.mic.allow')}
            </button>
            <button type="button" className="btn btn--ghost btn--block" disabled={saving} onClick={() => void finish('skipped')}>
              {t('onboarding.mic.skip')}
            </button>
          </>
        )}
        {step === TOTAL_STEPS && saveFailed && (
          <p className="notice notice--error" role="alert">
            {t('onboarding.saveFailed')}
          </p>
        )}
        {step === TOTAL_STEPS && micAnswered && (
          <button type="button" className="btn btn--primary btn--block" disabled={saving} onClick={() => void finish()}>
            {saving ? t('app.loading') : t('onboarding.finish')}
          </button>
        )}
        {step > 1 && (
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setStep(step - 1)}>
            {t('app.back')}
          </button>
        )}
      </div>
    </main>
  )
}
