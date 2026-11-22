import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatAgo, formatCount } from './socialFormat'

describe('formatCount', () => {
  it('keeps small numbers exact and compacts large ones', () => {
    expect(formatCount(511, 'en')).toBe('511')
    expect(formatCount(7962, 'en')).toBe('7,962')
    expect(formatCount(12480, 'en')).toBe('12.5K')
  })
})

describe('formatAgo', () => {
  it('formats relative time', () => {
    const now = Date.parse('2026-11-17T12:00:00Z')
    expect(formatAgo('2026-11-15T12:00:00Z', 'en', now)).toBe('2 days ago')
    expect(formatAgo('2026-11-17T11:59:30Z', 'en', now)).toBe('now')
  })
})

describe('without Intl.RelativeTimeFormat (Hermes)', () => {
  const now = Date.parse('2026-11-17T12:00:00Z')
  const RTF = Intl.RelativeTimeFormat
  beforeEach(() => {
    ;(Intl as { RelativeTimeFormat?: unknown }).RelativeTimeFormat = undefined
  })
  afterEach(() => {
    ;(Intl as { RelativeTimeFormat?: unknown }).RelativeTimeFormat = RTF
  })

  it('falls back to built-in phrases with plural forms', () => {
    expect(formatAgo('2026-11-15T12:00:00Z', 'en', now)).toBe('2 days ago')
    expect(formatAgo('2026-11-17T11:00:00Z', 'en', now)).toBe('1 hour ago')
    expect(formatAgo('2026-11-17T11:59:30Z', 'uk', now)).toBe('зараз')
    expect(formatAgo('2026-11-16T12:00:00Z', 'uk', now)).toBe('1 день тому')
    expect(formatAgo('2026-11-14T12:00:00Z', 'uk', now)).toBe('3 дні тому')
    expect(formatAgo('2026-11-17T11:49:00Z', 'uk', now)).toBe('11 хвилин тому')
    expect(formatAgo('2026-11-17T11:38:00Z', 'uk', now)).toBe('22 хвилини тому')
    expect(formatAgo('2026-11-10T12:00:00Z', 'es-ES', now)).toBe('hace 1 semana')
  })
})

describe('formatCount compact', () => {
  it('compacts millions without Intl compact notation', () => {
    expect(formatCount(2_340_000, 'en')).toBe('2.3M')
    expect(formatCount(10_000, 'en')).toBe('10K')
  })
})
