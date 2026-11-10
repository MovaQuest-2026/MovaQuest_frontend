import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Segmented } from '../components/Segmented'
import { TabBar } from '../components/TabBar'
import { useMicTest } from '../features/speech/useMicTest'
import { SUPPORTED_LANGUAGES } from '../i18n'
import { useUserStore, type Level, type PlaybackRate, type SubtitleMode } from '../store/useUserStore'

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']
const SUBTITLE_MODES: SubtitleMode[] = ['es+en', 'es+uk', 'es', 'off']
const RATES: PlaybackRate[] = [0.75, 1]

export function ProfilePage() {
  const { t } = useTranslation()
  const [confirmReset, setConfirmReset] = useState(false)
  const mic = useMicTest()

  const lang = useUserStore((s) => s.interfaceLanguage)
  const level = useUserStore((s) => s.level)
  const goal = useUserStore((s) => s.goal)
  const subtitleMode = useUserStore((s) => s.subtitleMode)
  const playbackRate = useUserStore((s) => s.playbackRate)
  const completedCount = useUserStore((s) => Object.keys(s.completedLessons).length)
  const { setInterfaceLanguage, setLevel, setGoal, setSubtitleMode, setPlaybackRate, resetProgress } =
    useUserStore.getState()

  const micBusy = mic.state === 'recording' || mic.state === 'playing'

  return (
    <>
      <main className="page page--with-tabbar">
        <h1 className="page__title">{t('profile.title')}</h1>

        <section className="field">
          <span className="field__label">{t('profile.language')}</span>
          <Segmented
            label={t('profile.language')}
            value={lang}
            options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`languages.${l}`) }))}
            onChange={setInterfaceLanguage}
          />
        </section>

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

        <section className="field">
          <span className="field__label">{t('profile.subtitles')}</span>
          <Segmented
            label={t('profile.subtitles')}
            value={subtitleMode}
            options={SUBTITLE_MODES.map((m) => ({ value: m, label: t(`profile.subtitleModes.${m}`) }))}
            onChange={setSubtitleMode}
            columns={2}
          />
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
          <p className="stat">{completedCount}</p>
          <p className="muted">{t('profile.progress.completed', { count: completedCount })}</p>
          <button
            type="button"
            className="btn btn--danger btn--block"
            disabled={completedCount === 0}
            onClick={() => setConfirmReset(true)}
          >
            {t('profile.reset.button')}
          </button>
        </section>
      </main>
      <TabBar />

      {confirmReset && (
        <div className="dialog-backdrop" onClick={() => setConfirmReset(false)}>
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
            <div className="row">
              <button type="button" className="btn spacer" onClick={() => setConfirmReset(false)}>
                {t('app.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--primary spacer"
                onClick={() => {
                  resetProgress()
                  setConfirmReset(false)
                }}
              >
                {t('profile.reset.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
