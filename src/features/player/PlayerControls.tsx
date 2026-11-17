import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../store/usePlayerStore'
import { SUBTITLE_LANGS, useUserStore } from '../../store/useUserStore'
import type { Lesson } from '../../types/lesson'
import { gapAtTime, type GapResult } from './gapMachine'

interface PlayerTopBarProps {
  lesson: Lesson
  results: GapResult[]
  gapIndex: number
  /** Плеєр TikTok не вміє змінювати швидкість. */
  canChangeSpeed: boolean
  /** Кружечки пройдених пауз натискні, лише поки відео грає або стоїть на паузі для відповіді. */
  canReview: boolean
  /** Відповісти на паузу ще раз (червоні й жовті кружечки). */
  onRetryGap: (gapId: string) => void
  /** Ще раз послухати слово правильно пройденої паузи (зелений кружечок). */
  onListenGap: (gapId: string) => void
}

export function PlayerTopBar({ lesson, results, gapIndex, canChangeSpeed, canReview, onRetryGap, onListenGap }: PlayerTopBarProps) {
  const { t } = useTranslation()
  const subtitleLangs = useUserStore((s) => s.subtitleLangs)
  const playbackRate = useUserStore((s) => s.playbackRate)
  const { toggleSubtitleLang, setPlaybackRate } = useUserStore.getState()
  const [ccOpen, setCcOpen] = useState(false)
  const [reviewGapId, setReviewGapId] = useState<string | null>(null)
  // Відрізок, у якому зараз відео: якщо цю паузу вже пройдено, зверху з'являється кнопка повтору слова.
  const segmentGapId = usePlayerStore((s) => (s.lesson ? (gapAtTime(s.lesson, s.currentTime)?.id ?? null) : null))
  const segmentResult = segmentGapId ? results.find((r) => r.gapId === segmentGapId) : undefined
  const reviewGap = reviewGapId ? lesson.gaps.find((g) => g.id === reviewGapId) : undefined
  const reviewResult = reviewGapId ? results.find((r) => r.gapId === reviewGapId) : undefined

  const ccState =
    subtitleLangs.length > 0 ? subtitleLangs.map((l) => t(`subtitleLangs.${l}`)).join(', ') : t('profile.subtitlesOff')

  return (
    <div className="player-topbar">
      <ol className="gap-dots" aria-label={t('player.progress', { done: results.length, total: lesson.gaps.length })}>
        {lesson.gaps.map((g, i) => {
          const r = results.find((x) => x.gapId === g.id)
          const state = r ? r.resolution : i === gapIndex ? 'current' : 'pending'
          return (
            <li key={g.id}>
              {r ? (
                <button
                  type="button"
                  className="gap-dots__hit"
                  disabled={!canReview}
                  aria-label={t(`player.reviewGap.${r.resolution === 'correct' ? 'listen' : 'retry'}`, { n: i + 1 })}
                  aria-expanded={reviewGapId === g.id}
                  onClick={() => {
                    setCcOpen(false)
                    setReviewGapId(reviewGapId === g.id ? null : g.id)
                  }}
                >
                  <span className={`gap-dots__dot gap-dots__dot--${state}`} />
                </button>
              ) : (
                <span className="gap-dots__hit">
                  <span className={`gap-dots__dot gap-dots__dot--${state}`} />
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="player-topbar__actions">
        <button
          type="button"
          className="icon-btn icon-btn--text"
          aria-label={`${t('player.subtitles')}: ${ccState}`}
          aria-expanded={ccOpen}
          aria-haspopup="true"
          onClick={() => setCcOpen((v) => !v)}
        >
          <span className={subtitleLangs.length === 0 ? 'strike' : undefined}>CC</span>
        </button>
        {canChangeSpeed && (
          <button
            type="button"
            className="icon-btn icon-btn--text"
            aria-label={t('player.speed')}
            onClick={() => setPlaybackRate(playbackRate === 1 ? 0.75 : 1)}
          >
            {playbackRate}×
          </button>
        )}
      </div>

      {canReview && segmentGapId && segmentResult && (
        <button
          type="button"
          className="review-chip"
          onClick={() => (segmentResult.resolution === 'correct' ? onListenGap(segmentGapId) : onRetryGap(segmentGapId))}
        >
          ↺ {segmentResult.resolution === 'correct' ? t('player.reviewGap.listenButton') : t('player.reviewGap.retryButton')}
        </button>
      )}

      {reviewGap && reviewResult && canReview && (
        <>
          <button type="button" className="cc-menu__backdrop" aria-label={t('app.close')} onClick={() => setReviewGapId(null)} />
          <div className="cc-menu review-menu" role="group" aria-label={t('player.reviewGap.title', { n: lesson.gaps.indexOf(reviewGap) + 1 })}>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                setReviewGapId(null)
                if (reviewResult.resolution === 'correct') onListenGap(reviewGap.id)
                else onRetryGap(reviewGap.id)
              }}
            >
              ↺ {reviewResult.resolution === 'correct' ? t('player.reviewGap.listenButton') : t('player.reviewGap.retryButton')}
            </button>
          </div>
        </>
      )}

      {ccOpen && (
        <>
          <button
            type="button"
            className="cc-menu__backdrop"
            aria-label={t('app.close')}
            onClick={() => setCcOpen(false)}
          />
          <div className="cc-menu" role="group" aria-label={t('player.subtitles')}>
            <p className="cc-menu__title">{t('player.subtitles')}</p>
            {SUBTITLE_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="checkbox"
                className="cc-menu__item"
                aria-checked={subtitleLangs.includes(l)}
                onClick={() => toggleSubtitleLang(l)}
              >
                <span className="cc-menu__check" aria-hidden="true">
                  {subtitleLangs.includes(l) ? '✓' : ''}
                </span>
                <span lang={l}>{t(`subtitleLangs.${l}`)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface PlayerControlsProps {
  lesson: Lesson
  results: GapResult[]
  onSeek: (time: number) => void
}

export function PlayerControls({ lesson, results, onSeek }: PlayerControlsProps) {
  const { t } = useTranslation()
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const known = Number.isFinite(duration) && duration > 0

  return (
    <div className="player-controls">
      <button type="button" className="icon-btn icon-btn--text" aria-label={t('player.back5')} onClick={() => onSeek(currentTime - 5)}>
        −5
      </button>
      <div className="scrubber-wrap">
        <input
          className="scrubber"
          type="range"
          min={0}
          max={known ? duration : 0}
          step={0.05}
          value={known ? Math.min(currentTime, duration) : 0}
          aria-label={t('player.seek')}
          onChange={(e) => onSeek(Number(e.target.value))}
          style={{ '--progress': known ? `${(currentTime / duration) * 100}%` : '0%' } as CSSProperties}
        />
        {known &&
          lesson.gaps.map((g) => (
            <span
              key={g.id}
              className={`scrubber__mark scrubber__mark--${results.find((r) => r.gapId === g.id)?.resolution ?? 'pending'}`}
              style={{ left: `${(g.pauseAt / duration) * 100}%` }}
              aria-hidden="true"
            />
          ))}
      </div>
      <button type="button" className="icon-btn icon-btn--text" aria-label={t('player.forward5')} onClick={() => onSeek(currentTime + 5)}>
        +5
      </button>
    </div>
  )
}
