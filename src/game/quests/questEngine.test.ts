import { describe, expect, it } from 'vitest'
import type { CityConfig, ZoneConfig } from '../../api/getCityConfig'
import type { Questline } from '../../api/getQuestline'
import vinnytsiaCity from '../../mocks/cities/vinnytsia.json'
import vinnytsiaQuests from '../../mocks/quests/vinnytsia_main.json'
import {
  QUEST_COMPLETE,
  evaluate,
  findGateTowards,
  getArrowTarget,
  getCurrentStep,
  isGateOpen,
  type QuestEvent,
  type QuestState,
} from './questEngine'

function zone(partial: Partial<ZoneConfig> & { id: string }): ZoneConfig {
  return {
    type: 'outdoor',
    tilemap: partial.id,
    spawn: { x: 0, y: 0 },
    npcs: [],
    doors: [],
    exits: [],
    ...partial,
  }
}

const gate = { x: 0, y: 0, w: 32, h: 32, spawn: { x: 0, y: 0 } }

const city: CityConfig = {
  id: 'test',
  name: { en: 'Test', uk: 'Тест' },
  culturalIntro: { en: '', uk: '' },
  startZone: 'street',
  questlineId: 'test_main',
  zones: [
    zone({
      id: 'street',
      npcs: [
        {
          id: 'npc_guard',
          name: { en: 'Guard', uk: 'Охоронець' },
          dialogueId: 'guard',
          zone: 'street',
          x: 0,
          y: 0,
          patrol: false,
        },
      ],
      doors: [{ ...gate, id: 'door_hall', target: 'hall' }],
      exits: [
        { ...gate, id: 'exit_park', target: 'park', requiresFlag: 'gate_open' },
      ],
    }),
    zone({
      id: 'hall',
      type: 'interior',
      npcs: [
        {
          id: 'npc_cashier',
          name: { en: 'Cashier', uk: 'Касирка' },
          dialogueId: 'cashier',
          zone: 'hall',
          x: 0,
          y: 0,
          patrol: false,
        },
      ],
      doors: [{ ...gate, id: 'door_out', target: 'street' }],
    }),
    zone({
      id: 'park',
      doors: [{ ...gate, id: 'door_kiosk', target: 'kiosk' }],
    }),
    zone({
      id: 'kiosk',
      type: 'interior',
      doors: [{ ...gate, id: 'door_out', target: 'park' }],
    }),
  ],
}

const questline: Questline = {
  id: 'test_main',
  cityId: 'test',
  steps: [
    {
      id: 'charge',
      zone: 'street',
      target: { npcId: 'npc_cashier' },
      objective: { en: 'Charge the phone', uk: 'Заряди телефон' },
      completeWhen: { flag: 'phone_charging' },
    },
    {
      id: 'leave',
      zone: 'street',
      target: { npcId: 'npc_guard' },
      objective: { en: 'Ask the guard', uk: 'Спитай охоронця' },
      completeWhen: { flag: 'gate_open' },
      advanceClockTo: '10:30',
    },
    {
      id: 'go_park',
      zone: 'street',
      target: { exitId: 'exit_park' },
      objective: { en: 'Go to the park', uk: 'Іди в парк' },
      startEffects: { setFlag: 'rain_started' },
      completeWhen: { zoneEntered: 'park' },
    },
    {
      id: 'talk',
      zone: 'park',
      target: { doorId: 'door_kiosk', hidden: true },
      objective: { en: 'Talk', uk: 'Поговори' },
      completeWhen: { dialogueFinished: 'florist' },
      completeEffects: { setFlag: 'talked' },
    },
  ],
  sideQuests: [],
}

function initialState(partial: Partial<QuestState> = {}): QuestState {
  return {
    flags: {},
    questStep: null,
    gameClock: '09:00',
    currentZone: 'street',
    ...partial,
  }
}

function apply(state: QuestState, event: QuestEvent): QuestState {
  const patch = evaluate(questline, state, event)
  return patch ? { ...state, ...patch } : state
}

describe('getCurrentStep', () => {
  it('повертає крок за questStep', () => {
    expect(getCurrentStep(questline, { questStep: 'leave' })?.id).toBe('leave')
  })

  it('повертає null, якщо квест не почався або завершений', () => {
    expect(getCurrentStep(questline, { questStep: null })).toBeNull()
    expect(getCurrentStep(questline, { questStep: QUEST_COMPLETE })).toBeNull()
  })
})

describe('evaluate', () => {
  it('стартує квест з першого кроку', () => {
    const patch = evaluate(questline, initialState(), { type: 'flag' })
    expect(patch?.questStep).toBe('charge')
  })

  it('повертає null, якщо нічого не змінилося', () => {
    const state = initialState({ questStep: 'charge' })
    expect(evaluate(questline, state, { type: 'flag' })).toBeNull()
  })

  it('закриває крок за прапорцем, переводить годинник і застосовує startEffects наступного', () => {
    let state = initialState({ questStep: 'leave' })
    state = apply({ ...state, flags: { gate_open: true } }, { type: 'flag' })
    expect(state.questStep).toBe('go_park')
    expect(state.gameClock).toBe('10:30')
    expect(state.flags.rain_started).toBe(true)
  })

  it('закриває кілька кроків ланцюжком, якщо їхні умови вже виконані', () => {
    const state = apply(
      initialState({ flags: { phone_charging: true, gate_open: true } }),
      { type: 'flag' },
    )
    expect(state.questStep).toBe('go_park')
  })

  it('не закриває крок, якщо прапорець не true', () => {
    const state = apply(
      initialState({ questStep: 'charge', flags: { phone_charging: 1 } }),
      { type: 'flag' },
    )
    expect(state.questStep).toBe('charge')
  })

  it('zoneEntered перевіряється за currentZone, тож працює і після F5', () => {
    const state = apply(
      initialState({ questStep: 'go_park', currentZone: 'park' }),
      { type: 'flag' },
    )
    expect(state.questStep).toBe('talk')
  })

  it('dialogueFinished закриває крок тільки для свого діалогу', () => {
    const state = initialState({ questStep: 'talk', currentZone: 'park' })
    expect(
      apply(state, { type: 'dialogueFinished', dialogueId: 'guard' }).questStep,
    ).toBe('talk')

    const done = apply(state, { type: 'dialogueFinished', dialogueId: 'florist' })
    expect(done.questStep).toBe(QUEST_COMPLETE)
    expect(done.flags.talked).toBe(true)
  })

  it('після завершення квесту нічого не робить', () => {
    const state = initialState({ questStep: QUEST_COMPLETE })
    expect(evaluate(questline, state, { type: 'flag' })).toBeNull()
  })

  it('невідомий questStep зі старого збереження перезапускає квест', () => {
    const patch = evaluate(
      questline,
      initialState({ questStep: 'removed_step' }),
      { type: 'flag' },
    )
    expect(patch?.questStep).toBe('charge')
  })
})

describe('isGateOpen', () => {
  it('requiresFlag відкриває тільки при true', () => {
    expect(isGateOpen({ requiresFlag: 'a' }, {})).toBe(false)
    expect(isGateOpen({ requiresFlag: 'a' }, { a: 'yes' })).toBe(false)
    expect(isGateOpen({ requiresFlag: 'a' }, { a: true })).toBe(true)
  })

  it('requiresFlagFalse закриває при true', () => {
    expect(isGateOpen({ requiresFlagFalse: 'b' }, {})).toBe(true)
    expect(isGateOpen({ requiresFlagFalse: 'b' }, { b: true })).toBe(false)
    expect(
      isGateOpen({ requiresFlag: 'a', requiresFlagFalse: 'b' }, { a: true }),
    ).toBe(true)
  })
})

describe('findGateTowards', () => {
  it('повертає перші двері на шляху до зони', () => {
    expect(findGateTowards(city, 'street', 'hall')).toEqual({
      kind: 'door',
      id: 'door_hall',
    })
    expect(findGateTowards(city, 'hall', 'kiosk')).toEqual({
      kind: 'door',
      id: 'door_out',
    })
  })

  it('повертає null для тієї ж зони або недосяжної', () => {
    expect(findGateTowards(city, 'street', 'street')).toBeNull()
    expect(findGateTowards(city, 'kiosk', 'nowhere')).toBeNull()
  })
})

describe('getArrowTarget', () => {
  it('показує на NPC, якщо він у поточній зоні', () => {
    const state = initialState({ questStep: 'charge', currentZone: 'hall' })
    expect(getArrowTarget(city, questline, state)).toEqual({
      kind: 'npc',
      id: 'npc_cashier',
    })
  })

  it('показує на двері, якщо ціль в іншій зоні', () => {
    const state = initialState({ questStep: 'charge' })
    expect(getArrowTarget(city, questline, state)).toEqual({
      kind: 'door',
      id: 'door_hall',
    })
  })

  it('не показує стрілку для hidden-цілі', () => {
    const state = initialState({ questStep: 'talk', currentZone: 'park' })
    expect(getArrowTarget(city, questline, state)).toBeNull()
  })
})

describe('акт 1 Вінниці на справжніх даних', () => {
  // У JSON зона NPC задається вкладеністю; getCityConfig додає її, тут вона для пошуку не потрібна.
  const realCity = vinnytsiaCity as unknown as CityConfig
  const realQuestline = vinnytsiaQuests as unknown as Questline

  function step(state: QuestState, event: QuestEvent): QuestState {
    const patch = evaluate(realQuestline, state, event)
    return patch ? { ...state, ...patch } : state
  }

  it('проходить від приїзду до Вишеньки', () => {
    let state = step(initialState({ currentZone: 'bus_station' }), {
      type: 'flag',
    })
    expect(state.questStep).toBe('charge_phone')
    expect(getArrowTarget(realCity, realQuestline, state)).toEqual({
      kind: 'door',
      id: 'door_hall',
    })

    state = { ...state, currentZone: 'bus_station_hall' }
    expect(getArrowTarget(realCity, realQuestline, state)).toEqual({
      kind: 'npc',
      id: 'npc_cashier',
    })

    state = step(
      { ...state, flags: { ...state.flags, phone_charging: true } },
      { type: 'flag' },
    )
    expect(state.questStep).toBe('leave_station')

    const exit = realCity.zones[0].exits[0]
    expect(isGateOpen(exit, state.flags)).toBe(false)

    state = step(
      { ...state, flags: { ...state.flags, exit_bus_station: true } },
      { type: 'flag' },
    )
    expect(state.questStep).toBe('buy_flowers')
    expect(state.gameClock).toBe('10:30')
    expect(isGateOpen(exit, state.flags)).toBe(true)
  })
})
