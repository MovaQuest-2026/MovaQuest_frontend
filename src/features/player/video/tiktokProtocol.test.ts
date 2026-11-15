import { describe, expect, it } from 'vitest'
import { commandMessage, extrapolateTime, parseTikTokMessage, tiktokPlayerUrl } from './tiktokProtocol'

describe('tiktokProtocol', () => {
  it('builds a player url without native controls', () => {
    const url = new URL(tiktokPlayerUrl('7312345678901234567'))
    expect(url.origin).toBe('https://www.tiktok.com')
    expect(url.pathname).toBe('/player/v1/7312345678901234567')
    expect(url.searchParams.get('controls')).toBe('0')
    expect(url.searchParams.get('autoplay')).toBe('0')
  })

  it('tags commands for the player', () => {
    expect(commandMessage({ type: 'seekTo', value: 3 })).toEqual({ 'x-tiktok-player': true, type: 'seekTo', value: 3 })
  })

  it('parses player events from objects and JSON strings', () => {
    expect(parseTikTokMessage({ 'x-tiktok-player': true, type: 'onPlayerReady' })).toEqual({ type: 'ready' })
    expect(parseTikTokMessage(JSON.stringify({ 'x-tiktok-player': true, type: 'onStateChange', value: 1 }))).toEqual({
      type: 'state',
      state: 1,
    })
    expect(
      parseTikTokMessage({ 'x-tiktok-player': true, type: 'onCurrentTime', value: { currentTime: 2.5, duration: 30 } }),
    ).toEqual({ type: 'time', currentTime: 2.5, duration: 30 })
  })

  it('ignores foreign or malformed messages', () => {
    expect(parseTikTokMessage({ type: 'onPlayerReady' })).toBeNull()
    expect(parseTikTokMessage('not json')).toBeNull()
    expect(parseTikTokMessage({ 'x-tiktok-player': true, type: 'onCurrentTime', value: {} })).toBeNull()
    expect(parseTikTokMessage(null)).toBeNull()
  })

  it('extrapolates time only while playing', () => {
    expect(extrapolateTime(2, 1000, 1250, true)).toBeCloseTo(2.25)
    expect(extrapolateTime(2, 1000, 1250, false)).toBe(2)
  })
})
