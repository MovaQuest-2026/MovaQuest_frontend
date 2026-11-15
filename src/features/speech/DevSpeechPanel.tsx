import { useState } from 'react'
import { isDevMode, setForcedVerdict } from '../../api/devOverrides'
import type { Verdict } from '../../lib/matchAnswer'

const VERDICTS: Verdict[] = ['correct', 'wrong', 'unclear']

// Видно тільки з ?dev=1. Примусово задає результат мок-розпізнавання.
// Службова панель для розробки, тому тексти не локалізуються.
export function DevSpeechPanel() {
  const [forced, setForced] = useState<Verdict | null>(null)
  if (!isDevMode()) return null

  const choose = (verdict: Verdict) => {
    const next = forced === verdict ? null : verdict
    setForced(next)
    setForcedVerdict(next)
  }

  return (
    <div className="dev-panel" role="group" aria-label="dev: force speech result">
      <span className="dev-panel__title">dev</span>
      {VERDICTS.map((v) => (
        <button key={v} type="button" aria-pressed={forced === v} onClick={() => choose(v)}>
          {v}
        </button>
      ))}
    </div>
  )
}
