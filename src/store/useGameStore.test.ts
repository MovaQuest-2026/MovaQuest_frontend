import { beforeEach, describe, expect, it } from 'vitest'
import type { CityConfig } from '../api/getCityConfig'
import { getAlphaProgress } from './alphaProgress'
import { useGameStore } from './useGameStore'

const city = {
  zones: [
    {
      id: 'glade',
      exits: [{ id: 'to_vinnytsia', setFlagOnConfirm: 'left_glade', setClockOnConfirm: '09:00' }],
    },
  ],
} as unknown as CityConfig

describe('pendingExit', () => {
  beforeEach(() => {
    useGameStore.setState({
      cityConfig: city,
      pendingExit: { zoneId: 'glade', exitId: 'to_vinnytsia' },
      flags: {},
      gameClock: '08:00',
      lastExitDecision: null,
    })
  })

  it('confirm ставить прапорець і час та фіксує рішення', () => {
    useGameStore.getState().confirmPendingExit()
    const state = useGameStore.getState()
    expect(state.pendingExit).toBeNull()
    expect(state.flags.left_glade).toBe(true)
    expect(state.gameClock).toBe('09:00')
    expect(state.lastExitDecision).toMatchObject({ confirmed: true, exitId: 'to_vinnytsia' })
  })

  it('cancel нічого не змінює у прапорцях і годиннику', () => {
    useGameStore.getState().cancelPendingExit()
    const state = useGameStore.getState()
    expect(state.pendingExit).toBeNull()
    expect(state.flags.left_glade).toBeUndefined()
    expect(state.gameClock).toBe('08:00')
    expect(state.lastExitDecision).toMatchObject({ confirmed: false })
  })
})

describe('getAlphaProgress', () => {
  it('рахує станції й відповіді', () => {
    expect(getAlphaProgress({ alpha_easy: true, alpha_special: true, alpha_score: 5 })).toEqual({
      stationsDone: 2,
      alphaScore: 5,
    })
  })
})
