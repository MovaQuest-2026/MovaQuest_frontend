import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signOut } from '../api/auth'
import { resetProgressRemote } from '../api/progress'
import { Segmented } from '../components/Segmented'
import { TabBar } from '../components/TabBar'
import { useMicTest } from '../features/speech/useMicTest'
import { SUPPORTED_LANGUAGES } from '../i18n'
import {
  SUBTITLE_LANGS,
  useUserStore,
  type Level,
  type PlaybackRate,
  type ThemePreference,
} from '../store/useUserStore'

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']
const THEMES: ThemePreference[] = ['system', 'light', 'dark']
const RATES: PlaybackRate[] = [0.75, 1]

export function ProfilePage() {
  const { t } = useTranslation()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetState, setResetState] = useState<'idle' | 'busy' | 'error'>('idle')
  const mic = useMicTest()
  const navigate = useNavigate()
  const account = useUserStore((s) => s.account)

  const lang = useUserStore((s) => s.interfaceLanguage)
  const level = useUserStore((s) => s.level)
  const goal = useUserStore((s) => s.goal)
  const subtitleLangs = useUserStore((s) => s.subtitleLangs)
  const theme = useUserStore((s) => s.theme)
  const playbackRate = useUserStore((s) => s.playbackRate)
  const signedIn = useUserStore((s) => s.account !== null)
  const completedCount = useUserStore((s) => Object.keys(s.completedLessons).length)
  const wordsLearned = useUserStore((s) => Object.values(s.learnedWords).reduce((n, ids) => n + ids.length, 0))
  // Точність: правильні відповіді з усіх пауз у пройдених уроках.
  const accuracy = useUserStore((s) => {
    const all = Object.values(s.completedLessons)
    const total = all.reduce((n, l) => n + l.total, 0)
    return total === 0 ? null : Math.round((all.reduce((n, l) => n + l.correct, 0) / total) * 100)
  })
  const { setInterfaceLanguage, setTheme, setLevel, setGoal, toggleSubtitleLang, setPlaybackRate, resetProgress } =
    useUserStore.getState()

  const micBusy = mic.state === 'recording' || mic.state === 'playing'

  // Спершу сервер, і лише після успіху локально: інакше синхронізація поверне прогрес із сервера.
  const confirmResetProgress = async () => {
    const accountId = useUserStore.getState().account?.id
    setResetState('busy')
    try {
      if (accountId) await resetProgressRemote(accountId)
    } catch {
      setResetState('error')
      return
    }
    if (useUserStore.getState().account?.id === accountId) resetProgress()
    setResetState('idle')
    setConfirmReset(false)
  }
  const closeReset = () => {
    setResetState('idle')
    setConfirmReset(false)
  }

  return (
    <>
      <main className="page page--with-tabbar">
        <h1 className="page__title">{t('profile.title')}</h1>

        {account && (
          <section className="card account-card">
            <span className="account-card__avatar" aria-hidden="true">
              {account.name.charAt(0).toUpperCase()}
            </span>
            <div className="account-card__body">
              <p className="account-card__name">{account.name}</p>
              <p className="muted account-card__email">{account.email}</p>
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                // Після виходу застосунок працює далі без акаунта; увійти можна з цієї ж картки.
                void signOut()
                const user = useUserStore.getState()
                user.setAccount(null)
                user.setOnboardingPending(false)
              }}
            >
              {t('auth.signOut')}
            </button>
          </section>
        )}

        {!account && (
          <section className="card account-card">
            <div className="account-card__body">
              <p className="account-card__name">{t('auth.guestTitle')}</p>
              <p className="muted">{t('auth.guestBody')}</p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate('/auth', { state: { from: '/profile' } })}
            >
              {t('auth.signInCta')}
            </button>
          </section>
        )}

        <section className="field">
          <span className="field__label">{t('profile.language')}</span>
          <Segmented
            label={t('profile.language')}
            compact
            value={lang}
            options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`languages.${l}`) }))}
            onChange={setInterfaceLanguage}
          />
        </section>

        <section className="field">
          <span className="field__label">{t('profile.theme')}</span>
          <Segmented
            label={t('profile.theme')}
            compact
            value={theme}
            options={THEMES.map((m) => ({ value: m, label: t(`profile.themes.${m}`) }))}
            onChange={setTheme}
          />
        </section>

        {/* Рівень і мета поїздки є частиною профілю акаунта; гостю їх не показуємо. */}
        {signedIn && (
          <>
          <section className="field">
            <span className="field__label">{t('profile.level')}</span>
            <Segmented
              label={t('profile.level')}
              value={level}
              options={LEVELS.map((l) => ({ value: l, label: l }))}
              onChange={setLevel}
            />
          </section>

          <label className="field">
            <span className="field__label">{t('profile.goal')}</span>
            <input
              className="input"
              value={goal}
              maxLength={120}
              placeholder={t('profile.goalPlaceholder')}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>
          </>
        )}

        <section className="field">
          <span className="field__label">{t('profile.subtitles')}</span>
          {/* Кілька мов одночасно, тому перемикачі, а не Segmented. */}
          <div className="segmented segmented--compact" role="group" aria-label={t('profile.subtitles')}>
            {SUBTITLE_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                className="segmented__item"
                lang={l}
                aria-pressed={subtitleLangs.includes(l)}
                onClick={() => toggleSubtitleLang(l)}
              >
                {t(`subtitleLangs.${l}`)}
              </button>
            ))}
          </div>
          <span className="muted">
            {subtitleLangs.length === 0 ? t('profile.subtitlesOff') : t('profile.subtitlesHint')}
          </span>
        </section>

        <section className="field">
          <span className="field__label">{t('profile.speed')}</span>
          <Segmented
            label={t('profile.speed')}
            value={playbackRate}
            options={RATES.map((r) => ({ value: r, label: `${r}×` }))}
            onChange={setPlaybackRate}
          />
        </section>

        <section className="card stack">
          <h2 className="section-title">{t('profile.mic.title')}</h2>
          <p className="muted">{t('profile.mic.hint')}</p>
          <button type="button" className="btn btn--block" disabled={micBusy} onClick={mic.start}>
            {mic.state === 'recording'
              ? t('profile.mic.recording', { seconds: mic.secondsLeft })
              : mic.state === 'playing'
                ? t('profile.mic.playing')
                : t('profile.mic.test')}
          </button>
          {mic.state === 'denied' && <p className="notice notice--error">{t('profile.mic.denied')}</p>}
          {mic.state === 'unsupported' && <p className="notice notice--error">{t('profile.mic.unsupported')}</p>}
          {mic.state === 'error' && <p className="notice notice--error">{t('profile.mic.error')}</p>}
        </section>

        <section className="card stack">
          <h2 className="section-title">{t('profile.progress.title')}</h2>
          {signedIn ? (
            <>
              <p className="stat">{wordsLearned}</p>
              <p className="muted">{t('profile.progress.words', { count: wordsLearned })}</p>
              <p className="muted">{t('profile.progress.completed', { count: completedCount })}</p>
              {accuracy !== null && <p className="muted">{t('profile.progress.accuracy', { percent: accuracy })}</p>}
              <button
                type="button"
                className="btn btn--danger btn--block"
                disabled={completedCount === 0 && wordsLearned === 0}
                onClick={() => setConfirmReset(true)}
              >
                {t('profile.reset.button')}
              </button>
            </>
          ) : (
            <>
              <p className="muted">{t('profile.progress.guest')}</p>
              <Link className="btn btn--primary btn--block" to="/auth" state={{ from: '/profile' }}>
                {t('auth.signInCta')}
              </Link>
            </>
          )}
        </section>
      </main>
      <TabBar />

      {confirmReset && (
        <div className="dialog-backdrop" onClick={closeReset}>
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reset-title" className="section-title">
              {t('profile.reset.title')}
            </h2>
            <p className="muted">{t('profile.reset.body')}</p>
            {resetState === 'error' && (
              <p className="notice notice--error" role="alert">
                {t('profile.reset.error')}
              </p>
            )}
            <div className="row">
              <button type="button" className="btn spacer" onClick={closeReset}>
                {t('app.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--primary spacer"
                disabled={resetState === 'busy'}
                onClick={() => void confirmResetProgress()}
              >
                {resetState === 'busy' ? t('profile.reset.busy') : t('profile.reset.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
