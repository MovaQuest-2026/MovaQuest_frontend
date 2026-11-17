import { describe, expect, it } from 'vitest'
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
