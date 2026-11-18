import { describe, expect, it } from 'vitest'
import { safeReturnPath, signInReturnPath } from './completeSignIn'

describe('where to go after /auth', () => {
  it('goes straight to the video after sign-in, back to the same lesson when it started there', () => {
    expect(signInReturnPath('/profile')).toBe('/app')
    expect(signInReturnPath('/lessons')).toBe('/app')
    expect(signInReturnPath(undefined)).toBe('/app')
    expect(signInReturnPath('/lesson/cafe-madrid')).toBe('/lesson/cafe-madrid')
    expect(signInReturnPath('/lesson/cafe-madrid/result')).toBe('/app')
    expect(signInReturnPath('/home')).toBe('/home')
    expect(signInReturnPath('//evil.example')).toBe('/app')
  })

  it('"Not now" returns to the page it came from', () => {
    expect(safeReturnPath('/profile')).toBe('/profile')
    expect(safeReturnPath('/auth')).toBe('/app')
  })
})
