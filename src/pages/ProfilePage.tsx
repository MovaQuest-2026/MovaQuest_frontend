import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trackSpeakModeChosen } from '../api/analytics'
import { deleteAccount, signOut } from '../api/auth'
import { ApiError } from '../api/http'
import { resetProgressRemote } from '../api/progress'
import { MultiSelect } from '../components/MultiSelect'
import { Segmented } from '../components/Segmented'
import { StepSlider } from '../components/StepSlider'
import { TabBar } from '../components/TabBar'
import { ThemePicker } from '../components/ThemePicker'
import { useMicTest } from '../features/speech/useMicTest'
import { SUPPORTED_LANGUAGES } from '../i18n'
import { formatRate } from '../lib/formatRate'
import {
  PLAYBACK_RATES,
  SPEAK_MODES,
  SUBTITLE_LANGS,
  useUserStore,
  type Level,
  type SpeakMode,
  type ThemePreference,
} from '../store/useUserStore'

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']
const THEMES: ThemePreference[] = ['system', 'light', 'dark']

export function ProfilePage() {
  const { t } = useTranslation()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetState, setResetState] = useState<'idle' | 'busy' | 'error'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteState, setDeleteState] = useState<'idle' | 'busy' | 'error' | 'signInAgain'>('idle')
  const [accountDeleted, setAccountDeleted] = useState(false)
  const mic = useMicTest()
  const navigate = useNavigate()
  const account = useUserStore((s) => s.account)

  const lang = useUserStore((s) => s.interfaceLanguage)
  const level = useUserStore((s) => s.level)
  const goal = useUserStore((s) => s.goal)
  const subtitleLangs = useUserStore((s) => s.subtitleLangs)
  const theme = useUserStore((s) => s.theme)
  const playbackRate = useUserStore((s) => s.playbackRate)
  // Ще не вибрано: показуємо tap (так поводиться плеєр), а вибір тут знімає питання на першій паузі.
  const speakMode = useUserStore((s) => s.speakMode) ?? 'tap'
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

  const changeSpeakMode = (mode: SpeakMode) => {
    useUserStore.getState().setSpeakMode(mode)
    trackSpeakModeChosen(mode, 'profile')
  }

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
  // Видалення акаунта: спершу сервер (він же завершує сесії), і лише після успіху прибираємо дані з пристрою.
  const confirmDeleteAccount = async () => {
    setDeleteState('busy')
    try {
      await deleteAccount()
    } catch (err) {
      setDeleteState(err instanceof ApiError && err.status === 401 ? 'signInAgain' : 'error')
      return
    }
    useUserStore.getState().forgetAccount()
    setDeleteState('idle')
    setConfirmDelete(false)
    setAccountDeleted(true)
  }
  const closeDelete = () => {
    if (deleteState === 'busy') return
    setDeleteState('idle')
    setConfirmDelete(false)
  }
  const closeReset = () => {
    setResetState('idle')
    setConfirmReset(false)
  }

  return (
    <>
      <main className="page page--with-tabbar">
        <h1 className="page__title">{t('profile.title')}</h1>

        {accountDeleted && !account && (
          <p className="notice notice--ok" role="status">
            {t('profile.deleteAccount.done')}
          </p>
        )}

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

        {/* Гість: одна картка входу (без окремої кнопки в «Прогресі»). */}
        {!account && (
          <section className="card account-card">
            <p className="account-card__body account-card__name">{t('auth.guestBody')}</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate('/auth', { state: { from: '/profile' } })}
            >
              {t('auth.signInCta')}
            </button>
          </section>
        )}

        {signedIn && (
          <section className="card stack">
            <h2 className="section-title">{t('profile.progress.title')}</h2>
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
          </section>
        )}

        {/* Рівень і мета поїздки є частиною профілю акаунта; гостю їх не показуємо. */}
        {signedIn && (
          <section className="settings-group">
            <h2 className="settings-group__title">{t('profile.sections.learning')}</h2>
            <div className="settings-group__body">
              <div className="field">
                <span className="field__label">{t('profile.level')}</span>
                <Segmented
                  label={t('profile.level')}
                  value={level}
                  options={LEVELS.map((l) => ({ value: l, label: l }))}
                  onChange={setLevel}
                />
              </div>
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
            </div>
          </section>
        )}

        <section className="settings-group">
          <h2 className="settings-group__title">{t('profile.sections.video')}</h2>
          <div className="settings-group__body">
            <div className="field">
              <span className="field__label">{t('profile.subtitles')}</span>
              <MultiSelect
                label={t('profile.subtitles')}
                values={subtitleLangs}
                placeholder={t('profile.subtitlesOff')}
                options={SUBTITLE_LANGS.map((l) => ({ value: l, label: t(`subtitleLangs.${l}`), lang: l }))}
                onToggle={toggleSubtitleLang}
              />
              <span className="field__hint">{t('profile.subtitlesHint')}</span>
            </div>
            <div className="field">
              <span className="field__label">{t('profile.speed')}</span>
              <StepSlider
                label={t('profile.speed')}
                value={playbackRate}
                steps={PLAYBACK_RATES}
                format={formatRate}
                onChange={setPlaybackRate}
              />
            </div>
          </div>
        </section>

        <section className="settings-group">
          <h2 className="settings-group__title">{t('profile.sections.appearance')}</h2>
          <div className="settings-group__body">
            <div className="field">
              <span className="field__label">{t('profile.language')}</span>
              <Segmented
                label={t('profile.language')}
                compact
                value={lang}
                options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`languages.${l}`) }))}
                onChange={setInterfaceLanguage}
              />
            </div>
            <div className="field">
              <span className="field__label">{t('profile.theme')}</span>
              <ThemePicker
                label={t('profile.theme')}
                value={theme}
                options={THEMES.map((m) => ({ value: m, label: t(`profile.themes.${m}`) }))}
                onChange={setTheme}
              />
            </div>
          </div>
        </section>

        <section className="settings-group">
          <h2 className="settings-group__title">{t('profile.mic.title')}</h2>
          <div className="settings-group__body">
            <div className="field">
              <span className="field__label">{t('speakMode.setting')}</span>
              <Segmented
                label={t('speakMode.setting')}
                value={speakMode}
                options={SPEAK_MODES.map((m) => ({ value: m, label: t(`speakMode.${m}.label`) }))}
                onChange={changeSpeakMode}
              />
              <span className="field__hint">{t(`speakMode.${speakMode}.body`)}</span>
            </div>
            <p className="field__hint">{t('profile.mic.hint')}</p>
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
          </div>
        </section>
        {/* Видалення акаунта (вимога Google Play і GDPR): наприкінці профілю, з підтвердженням. */}
        {account && (
          <section className="settings-group">
            <h2 className="settings-group__title">{t('profile.deleteAccount.title')}</h2>
            <div className="settings-group__body">
              <p className="muted">{t('profile.deleteAccount.hint')}</p>
              <button type="button" className="btn btn--danger btn--block" onClick={() => setConfirmDelete(true)}>
                {t('profile.deleteAccount.button')}
              </button>
            </div>
          </section>
        )}

        <Link to="/privacy" className="link-btn profile__legal">
          {t('legal.link')}
        </Link>
      </main>
      <TabBar />

      {confirmDelete && (
        <div className="dialog-backdrop" onClick={closeDelete}>
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-body"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-title" className="section-title">
              {t('profile.deleteAccount.dialogTitle')}
            </h2>
            <p id="delete-body" className="muted">
              {t('profile.deleteAccount.body')}
            </p>
            {(deleteState === 'error' || deleteState === 'signInAgain') && (
              <p className="notice notice--error" role="alert">
                {t(`profile.deleteAccount.${deleteState}`)}
              </p>
            )}
            <div className="row">
              <button type="button" className="btn spacer" disabled={deleteState === 'busy'} onClick={closeDelete}>
                {t('app.cancel')}
              </button>
              {deleteState === 'signInAgain' ? (
                <button
                  type="button"
                  className="btn btn--primary spacer"
                  onClick={() => {
                    // Сесії на сервері вже немає: виходимо локально, інакше /auth одразу поверне назад.
                    const user = useUserStore.getState()
                    user.setAccount(null)
                    user.setOnboardingPending(false)
                    navigate('/auth', { state: { from: '/profile' } })
                  }}
                >
                  {t('auth.signInCta')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--danger spacer"
                  disabled={deleteState === 'busy'}
                  onClick={() => void confirmDeleteAccount()}
                >
                  {deleteState === 'busy' ? t('profile.deleteAccount.busy') : t('profile.deleteAccount.confirm')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
