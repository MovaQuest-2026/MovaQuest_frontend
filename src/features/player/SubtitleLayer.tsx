import { useUserStore } from '../../store/useUserStore'
import type { Scene } from '../../types/lesson'

interface SubtitleLayerProps {
  subtitles: Scene['subtitles']
}

export function SubtitleLayer({ subtitles }: SubtitleLayerProps) {
  const mode = useUserStore((s) => s.subtitleMode)
  if (mode === 'off') return null
  const translation = mode === 'es+en' ? subtitles.en : mode === 'es+uk' ? subtitles.uk : null
  return (
    <div className="subtitles" aria-live="polite">
      <p className="subtitles__es" lang="es">
        {subtitles.es}
      </p>
      {translation && <p className="subtitles__tr">{translation}</p>}
    </div>
  )
}
