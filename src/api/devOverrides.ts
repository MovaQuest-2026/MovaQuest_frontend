import type { Verdict } from '../lib/matchAnswer'

// Dev-перемикач для мок-розпізнавання (?dev=1). Живе лише в пам'яті вкладки.
let forcedVerdict: Verdict | null = null

export function isDevMode(): boolean {
  return new URLSearchParams(window.location.search).get('dev') === '1'
}

export function getForcedVerdict(): Verdict | null {
  return isDevMode() ? forcedVerdict : null
}

export function setForcedVerdict(verdict: Verdict | null) {
  forcedVerdict = verdict
}
