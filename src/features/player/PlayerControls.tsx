import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore, type SubtitleMode } from '../../store/useUserStore'

interface PlayerControlsProps {
  onSeek: (time: number) => void
}

export function PlayerTopBar() {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const subtitleMode = useUserStore((s) => s.subtitleMode)
  const playbackRate = useUserStore((s) => s.playbackRate)
  const { setSubtitleMode, setPlaybackRate } = useUserStore.getState()

  // Кнопка субтитрів перебирає: es + переклад → тільки es → вимкнено.
  const cycle: SubtitleMode[] = [`es+${lang}`, 'es', 'off']
  const nextMode = cycle[(cycle.indexOf(subtitleMode) + 1) % cycle.length]

  return (
    <div className="player-topbar">
      <Link to="/lessons" className="icon-btn" aria-label={t('player.exit')}>
        ✕
      </Link>
      <div className="spacer" />
      <button
        type="button"
        className="icon-btn icon-btn--text"
        aria-label={`${t('player.subtitles')}: ${t(`profile.subtitleModes.${subtitleMode}`)}`}
        onClick={() => setSubtitleMode(nextMode)}
      >
        <span className={subtitleMode === 'off' ? 'strike' : undefined}>CC</span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn--text"
        aria-label={t('player.speed')}
        onClick={() => setPlaybackRate(playbackRate === 1 ? 0.75 : 1)}
      >
        {playbackRate}×
      </button>
    </div>
  )
}

export function PlayerControls({ onSeek }: PlayerControlsProps) {
  const { t } = useTranslation()
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)

  return (
    <div className="player-controls">
      <button type="button" className="icon-btn icon-btn--text" aria-label={t('player.back5')} onClick={() => onSeek(currentTime - 5)}>
        −5
      </button>
      <input
        className="scrubber"
        type="range"
        min={0}
        max={duration || 0}
        step={0.05}
        value={Math.min(currentTime, duration || 0)}
        aria-label={t('player.seek')}
        onChange={(e) => onSeek(Number(e.target.value))}
        style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' } as CSSProperties}
      />
      <button type="button" className="icon-btn icon-btn--text" aria-label={t('player.forward5')} onClick={() => onSeek(currentTime + 5)}>
        +5
      </button>
    </div>
  )
}
