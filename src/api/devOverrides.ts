import type { BranchKind } from '../types/lesson'

// Dev-перемикач для мок-розпізнавання (?dev=1). Живе лише в пам'яті вкладки.
let forcedBranch: BranchKind | null = null

export function isDevMode(): boolean {
  return new URLSearchParams(window.location.search).get('dev') === '1'
}

export function getForcedBranch(): BranchKind | null {
  return isDevMode() ? forcedBranch : null
}

export function setForcedBranch(branch: BranchKind | null) {
  forcedBranch = branch
}
