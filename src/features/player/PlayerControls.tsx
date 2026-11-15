import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore } from '../../store/useUserStore'
import type { Lesson } from '../../types/lesson'
import type { GapResult } from './gapMachine'

interface PlayerTopBarProps {
  lesson: Lesson
  results: GapResult[]
  gapIndex: number
  /** Плеєр TikTok не вміє змінювати швидкість. */
  canChangeSpeed: boolean
}

export function PlayerTopBar({ lesson, results, gapIndex, canChangeSpeed }: PlayerTopBarProps) {
  const { t } = useTranslation()
  const subtitleMode = useUserStore((s) => s.subtitleMode)
  const playbackRate = useUserStore((s) => s.playbackRate)
  const { setSubtitleMode, setPlaybackRate } = useUserStore.getState()

  return (
    <div className="player-topbar">
      <Link to="/lessons" className="icon-btn" aria-label={t('player.exit')}>
        ✕
      </Link>
      <div className="spacer" />
      <ol className="gap-dots" aria-label={t('player.progress', { done: results.length, total: lesson.gaps.length })}>
        {lesson.gaps.map((g, i) => {
          const r = results.find((x) => x.gapId === g.id)
          const state = r ? r.resolution : i === gapIndex ? 'current' : 'pending'
          return <li key={g.id} className={`gap-dots__dot gap-dots__dot--${state}`} />
        })}
      </ol>
      <div className="spacer" />
      <button
        type="button"
        className="icon-btn icon-btn--text"
        aria-label={`${t('player.subtitles')}: ${t(`profile.subtitleModes.${subtitleMode}`)}`}
        aria-pressed={subtitleMode === 'on'}
        onClick={() => setSubtitleMode(subtitleMode === 'on' ? 'off' : 'on')}
      >
        <span className={subtitleMode === 'off' ? 'strike' : undefined}>CC</span>
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
  )
}

interface PlayerControlsProps {
  lesson: Lesson
  onSeek: (time: number) => void
}

export function PlayerControls({ lesson, onSeek }: PlayerControlsProps) {
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
              className="scrubber__mark"
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
