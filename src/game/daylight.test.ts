import { describe, expect, it } from 'vitest'
import { clockToMinutes, daylightForClock, mixTint } from './daylight'

describe('daylightForClock', () => {
  it('ключові точки доби', () => {
    expect(daylightForClock('09:00')).toEqual({ color: 0xffc58a, alpha: 0.32 })
    expect(daylightForClock('13:00')).toEqual({ color: 0xffffff, alpha: 0 })
    expect(daylightForClock('18:30')).toEqual({ color: 0xffb04a, alpha: 0.35 })
    expect(daylightForClock('20:00')).toEqual({ color: 0x5b4fc4, alpha: 0.5 })
  })

  it('між 09:00 і 10:30 оверлей помітний', () => {
    for (const clock of ['09:00', '09:30', '10:30']) {
      expect(daylightForClock(clock).alpha).toBeGreaterThan(0.15)
    }
  })

  it('інтерполює між ключовими точками і обрізає краї', () => {
    const noon = daylightForClock('11:00')
    expect(noon.alpha).toBeCloseTo(0.16)
    expect(daylightForClock('06:00')).toEqual(daylightForClock('09:00'))
    expect(daylightForClock('23:00')).toEqual(daylightForClock('20:00'))
  })

  it('некоректний час дає ранок', () => {
    expect(clockToMinutes('abc')).toBe(9 * 60)
  })
})

describe('mixTint', () => {
  it('змішує канали кольору окремо', () => {
    expect(mixTint({ color: 0x000000, alpha: 0 }, { color: 0xff8000, alpha: 1 }, 0.5)).toEqual({
      color: 0x804000,
      alpha: 0.5,
    })
  })
})
