import { useState } from 'react'
import { isDevMode, setForcedBranch } from '../../api/devOverrides'
import type { BranchKind } from '../../types/lesson'

const BRANCHES: BranchKind[] = ['correct', 'wrong', 'unclear']

// Видно тільки з ?dev=1. Примусово задає результат мок-розпізнавання.
// Службова панель для розробки, тому тексти не локалізуються.
export function DevSpeechPanel() {
  const [forced, setForced] = useState<BranchKind | null>(null)
  if (!isDevMode()) return null

  const choose = (branch: BranchKind) => {
    const next = forced === branch ? null : branch
    setForced(next)
    setForcedBranch(next)
  }

  return (
    <div className="dev-panel" role="group" aria-label="dev: force speech result">
      <span className="dev-panel__title">dev</span>
      {BRANCHES.map((b) => (
        <button key={b} type="button" aria-pressed={forced === b} onClick={() => choose(b)}>
          {b}
        </button>
      ))}
    </div>
  )
}
