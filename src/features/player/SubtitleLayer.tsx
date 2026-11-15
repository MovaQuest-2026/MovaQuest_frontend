import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore } from '../../store/useUserStore'
import type { Cue } from '../../types/lesson'

interface SubtitleLayerProps {
  cues: Cue[]
}

// Іспанські субтитри за часом відео. Перекладу немає: це ламало б завдання «скажи наступне слово».
export function SubtitleLayer({ cues }: SubtitleLayerProps) {
  const mode = useUserStore((s) => s.subtitleMode)
  const cue = usePlayerStore((s) => cues.find((c) => s.currentTime >= c.start && s.currentTime < c.end) ?? null)
  if (mode === 'off' || !cue) return null
  return (
    <div className="subtitles" aria-live="polite">
      <p className="subtitles__es" lang="es">
        {cue.es}
      </p>
    </div>
  )
}
