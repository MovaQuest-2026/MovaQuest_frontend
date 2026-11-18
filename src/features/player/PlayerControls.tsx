import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../store/usePlayerStore'
import { SUBTITLE_LANGS, useUserStore } from '../../store/useUserStore'
import type { Lesson } from '../../types/lesson'
import { gapAtTime, wordJumpTarget, type GapResult } from './gapMachine'

const NO_WORDS: string[] = []

/**
 * Слова цього уроку, які користувач уже колись сказав правильно (профіль, learnedWords; у гостя порожньо).
 * Кружечки й мітки показують поточне проходження, а вивчені слова, ще не сказані в ньому, мають зелений контур.
 */
function useLearnedGapIds(lessonId: string): string[] {
  return useUserStore((s) => s.learnedWords[lessonId] ?? NO_WORDS)
}

const learnedClass = (base: string, learned: string[], gapId: string, result: GapResult | undefined) =>
  learned.includes(gapId) && result?.resolution !== 'correct' ? ` ${base}--learned` : ''

interface PlayerTopBarProps {
  lesson: Lesson
  results: GapResult[]
  gapIndex: number
  /** Плеєр TikTok не вміє змінювати швидкість. */
  canChangeSpeed: boolean
  /** Кнопка повтору слова показується, лише поки відео грає або стоїть на паузі для відповіді. */
  canReview: boolean
  /** Відповісти на паузу ще раз: заново (червона або жовта) або для практики (зелена, результат лишається). */
  onRetryGap: (gapId: string) => void
}

export function PlayerTopBar({ lesson, results, gapIndex, canChangeSpeed, canReview, onRetryGap }: PlayerTopBarProps) {
  const { t } = useTranslation()
  const subtitleLangs = useUserStore((s) => s.subtitleLangs)
  const playbackRate = useUserStore((s) => s.playbackRate)
  const { toggleSubtitleLang, setPlaybackRate } = useUserStore.getState()
  const [ccOpen, setCcOpen] = useState(false)
  // Відрізок, у якому зараз відео: якщо цю паузу вже пройдено, зверху з'являється кнопка повтору слова.
  const segmentGapId = usePlayerStore((s) => (s.lesson ? (gapAtTime(s.lesson, s.currentTime)?.id ?? null) : null))
  const segmentResult = segmentGapId ? results.find((r) => r.gapId === segmentGapId) : undefined
  const learned = useLearnedGapIds(lesson.id)
  const learnedCount = lesson.gaps.filter((g) => learned.includes(g.id)).length
  const progressLabel = t('player.progress', { done: results.length, total: lesson.gaps.length })

  const ccState =
    subtitleLangs.length > 0 ? subtitleLangs.map((l) => t(`subtitleLangs.${l}`)).join(', ') : t('profile.subtitlesOff')

  return (
    <div className="player-topbar">
      <ol
        className="gap-dots"
        aria-label={learnedCount > 0 ? `${progressLabel}. ${t('player.learnedWords', { count: learnedCount })}` : progressLabel}
      >
        {lesson.gaps.map((g, i) => {
          const r = results.find((x) => x.gapId === g.id)
          const state = r ? r.resolution : i === gapIndex ? 'current' : 'pending'
          return (
            <li
              key={g.id}
              className={`gap-dots__dot gap-dots__dot--${state}${learnedClass('gap-dots__dot', learned, g.id, r)}`}
            />
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
          onClick={() => onRetryGap(segmentGapId)}
        >
          ↺ {segmentResult.resolution === 'correct' ? t('player.reviewGap.listenButton') : t('player.reviewGap.retryButton')}
        </button>
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
  const prevTarget = wordJumpTarget(lesson, currentTime, 'prev')
  const nextTarget = wordJumpTarget(lesson, currentTime, 'next')
  const learned = useLearnedGapIds(lesson.id)

  return (
    <div className="player-controls">
      <button
        type="button"
        className="icon-btn"
        aria-label={t('player.prevWord')}
        disabled={prevTarget === null}
        onClick={() => prevTarget !== null && onSeek(prevTarget)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </svg>
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
          lesson.gaps.map((g) => {
            const r = results.find((x) => x.gapId === g.id)
            return (
              <span
                key={g.id}
                className={`scrubber__mark scrubber__mark--${r?.resolution ?? 'pending'}${learnedClass('scrubber__mark', learned, g.id, r)}`}
                style={{ left: `${(g.pauseAt / duration) * 100}%` }}
                aria-hidden="true"
              />
            )
          })}
      </div>
      <button
        type="button"
        className="icon-btn"
        aria-label={t('player.nextWord')}
        disabled={nextTarget === null}
        onClick={() => nextTarget !== null && onSeek(nextTarget)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </button>
    </div>
  )
}
