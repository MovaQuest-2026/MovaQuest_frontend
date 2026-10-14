import { describe, expect, it } from 'vitest'
import { isRainActive } from './weather'

describe('isRainActive', () => {
  it('дощ іде між rain_started і rain_over', () => {
    expect(isRainActive({})).toBe(false)
    expect(isRainActive({ rain_started: true })).toBe(true)
    expect(isRainActive({ rain_started: true, rain_over: true })).toBe(false)
  })
})
