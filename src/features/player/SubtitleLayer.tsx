import { usePlayerStore } from '../../store/usePlayerStore'
import { useUserStore } from '../../store/useUserStore'
import type { Cue } from '../../types/lesson'

interface SubtitleLayerProps {
  cues: Cue[]
}

// Субтитри за часом відео обраними мовами: іспанський оригінал і/або переклад.
// Під час паузи шар схований, тож ні оригінал, ні переклад не підказують відповідь.
export function SubtitleLayer({ cues }: SubtitleLayerProps) {
  const langs = useUserStore((s) => s.subtitleLangs)
  const cue = usePlayerStore((s) => cues.find((c) => s.currentTime >= c.start && s.currentTime < c.end) ?? null)
  if (!cue) return null
  const lines = langs.flatMap((lang) => {
    const text = lang === 'es' ? cue.es : cue.tr?.[lang]
    return text ? [{ lang, text }] : []
  })
  if (lines.length === 0) return null
  return (
    <div className="subtitles" aria-live="polite">
      {lines.map((l) => (
        <p key={l.lang} className="subtitles__line" lang={l.lang}>
          {l.text}
        </p>
      ))}
    </div>
  )
}
