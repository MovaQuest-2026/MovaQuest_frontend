import { describe, expect, it } from 'vitest'
import { Story } from 'inkjs'
import type { CityConfig } from '../../api/getCityConfig'
import type { Questline } from '../../api/getQuestline'
import vinnytsiaCity from '../../mocks/cities/vinnytsia.json'
import vinnytsiaQuests from '../../mocks/quests/vinnytsia_main.json'
import centerOstap from '../../mocks/dialogues/center_ostap.ink.json'
import centerArtist from '../../mocks/dialogues/center_artist.ink.json'
import centerTower from '../../mocks/dialogues/center_tower.ink.json'
import vinnytsiaCafe from '../../mocks/dialogues/vinnytsia_cafe.ink.json'
import { evaluate, getArrowTarget, isGateOpen, type QuestEvent, type QuestFlags, type QuestState } from './questEngine'
import { isRainActive } from '../weather'

const city = vinnytsiaCity as unknown as CityConfig
const questline = vinnytsiaQuests as unknown as Questline
const center = city.zones.find((zone) => zone.id === 'center')!

interface DialogueRun {
  flags: QuestFlags
  lines: string[]
  tags: string[]
}

/**
 * Проганяє ink-діалог так, як DialogueOverlay: flags записуються в змінні перед стартом,
 * на quiz: ставиться quiz_ok, вибори — за індексом або за частиною тексту.
 */
function runDialogue(
  dialogue: { inkContent: { uk: object } },
  flags: QuestFlags,
  { choices = [], quizOk = true }: { choices?: (number | string)[]; quizOk?: boolean } = {},
): DialogueRun {
  const story = new Story(JSON.stringify(dialogue.inkContent.uk))
  const result: DialogueRun = { flags: { ...flags }, lines: [], tags: [] }
  for (const [name, value] of Object.entries(flags)) {
    if (story.variablesState.GetVariableWithName(name) !== null) {
      story.variablesState[name] = value
    }
  }
  story.variablesState.ObserveVariableChange((name: string) => {
    result.flags[name] = story.variablesState[name] as QuestFlags[string]
  })

  const pending = [...choices]
  for (let guard = 0; guard < 100; guard++) {
    if (story.canContinue) {
      const line = (story.Continue() ?? '').trim()
      if (line) result.lines.push(line)
      const tags = story.currentTags ?? []
      result.tags.push(...tags)
      for (const tag of tags) {
        if (tag.startsWith('flag:')) result.flags[tag.slice(5)] = true
        if (tag.startsWith('quiz:')) story.variablesState.quiz_ok = quizOk
      }
      continue
    }
    if (story.currentChoices.length === 0) break
    const next = pending.shift() ?? 0
    const index =
      typeof next === 'number'
        ? next
        : story.currentChoices.findIndex((choice) => choice.text.includes(next))
    if (index < 0) throw new Error(`Немає вибору "${next}"`)
    story.ChooseChoiceIndex(index)
  }
  return result
}

describe('акт 4: Остап і короткий шлях', () => {
  const shortcut = center.exits.find((exit) => exit.id === 'shortcut_mury')!

  it('правильна відповідь відкриває короткий шлях', () => {
    const run = runDialogue(centerOstap, {}, { quizOk: true })
    expect(run.flags.pirogov_asked).toBe(true)
    expect(run.flags.knows_pirogov).toBe(true)
    expect(run.tags).toContain('flag:shortcut_open')
    expect(isGateOpen(shortcut, run.flags)).toBe(true)
  })

  it('неправильна відповідь дає листівку і не відкриває шлях', () => {
    const run = runDialogue(centerOstap, {}, { quizOk: false })
    expect(run.flags.pirogov_asked).toBe(true)
    expect(run.flags.knows_pirogov).not.toBe(true)
    expect(run.tags).toContain('give:pirogov_card')
    expect(run.tags).not.toContain('flag:shortcut_open')
    expect(isGateOpen(shortcut, run.flags)).toBe(false)
  })

  it('повторна розмова — коротка репліка без вправи', () => {
    const repeats: QuestFlags[] = [{ pirogov_asked: true, knows_pirogov: true }, { pirogov_asked: true }]
    for (const flags of repeats) {
      const run = runDialogue(centerOstap, flags)
      expect(run.lines).toHaveLength(1)
      expect(run.tags.some((tag) => tag.startsWith('quiz:'))).toBe(false)
    }
  })

  it('самоперехід shortcut_mury веде в ту саму зону до Мурів', () => {
    expect(shortcut.target).toBe('center')
    const trigger = center.triggers!.find((candidate) => candidate.id === 'mury_rain')!
    const { x, y } = shortcut.spawn
    expect(x >= trigger.x && x <= trigger.x + trigger.w && y >= trigger.y && y <= trigger.y + trigger.h).toBe(true)
  })
})

describe('акт 4: художник, дощ і парасолька', () => {
  it('без парасольки малюнка немає', () => {
    const run = runDialogue(centerArtist, { has_umbrella: false }, { choices: ['немає парасольки'] })
    expect(run.flags.has_drawing).not.toBe(true)
    expect(run.tags).not.toContain('give:drawing')
  })

  it('варіант з парасолькою недоступний, якщо її немає', () => {
    const story = new Story(JSON.stringify(centerArtist.inkContent.uk))
    story.variablesState.has_umbrella = false
    while (story.canContinue) story.Continue()
    expect(story.currentChoices.some((choice) => choice.text.includes('парасольку!'))).toBe(false)
  })

  it('з парасолькою: малюнок, парасолька забирається', () => {
    const run = runDialogue(
      centerArtist,
      { has_umbrella: true, trust: 2 },
      { choices: ['Тримайте мою парасольку'] },
    )
    expect(run.flags.has_drawing).toBe(true)
    expect(run.flags.has_umbrella).toBe(false)
    expect(run.flags.trust).toBe(3)
    expect(run.tags).toEqual(expect.arrayContaining(['take:umbrella', 'give:drawing']))
  })

  it('дощ біля Мурів: тригер вмикає, кінець діалогу center_artist вимикає', () => {
    let state: QuestState = {
      flags: { rain_started: true, rain_over: true },
      questStep: 'dessert',
      gameClock: '15:00',
      currentZone: 'center',
    }
    expect(isRainActive(state.flags)).toBe(false)

    state = { ...state, flags: { ...state.flags, rain_mury: true } }
    expect(isRainActive(state.flags)).toBe(true)

    const patch = evaluate(questline, state, { type: 'dialogueFinished', dialogueId: 'center_artist' })
    expect(patch?.flags.rain_mury_over).toBe(true)
    expect(patch?.questStep).toBe('dessert')
    expect(isRainActive(patch!.flags)).toBe(false)
  })

  it('ефект кінця діалогу працює і після завершення квесту', () => {
    const patch = evaluate(
      questline,
      { flags: {}, questStep: '__complete__', gameClock: '20:00', currentZone: 'center' },
      { type: 'dialogueFinished', dialogueId: 'center_artist' },
    )
    expect(patch?.flags.rain_mury_over).toBe(true)
  })
})

describe('акт 4: вежа, кав\'ярня і вихід на набережну', () => {
  const exit = center.exits.find((candidate) => candidate.id === 'exit_embankment')!

  it('вихід на набережну закритий без task_show_time і має підказку', () => {
    expect(isGateOpen(exit, {})).toBe(false)
    expect(exit.lockedHint).toBe('world.locked.showTime')
  })

  it('вежа ставить task_show_time незалежно від відповіді', () => {
    for (const quizOk of [true, false]) {
      const run = runDialogue(centerTower, {}, { choices: ['О котрій'], quizOk })
      expect(run.flags.task_show_time).toBe(true)
      expect(isGateOpen(exit, run.flags)).toBe(true)
    }
  })

  it('кав\'ярня дає десерт і ставить task_dessert', () => {
    for (const quizOk of [true, false]) {
      const run = runDialogue(vinnytsiaCafe, {}, { choices: [0, 'десерт для подруги'], quizOk })
      expect(run.flags.task_dessert).toBe(true)
      expect(run.tags).toContain('give:dessert')
    }
  })

  it('кроки акту 4 від тролейбуса до набережної', () => {
    const step = (state: QuestState, event: QuestEvent) => {
      const patch = evaluate(questline, state, event)
      return patch ? { ...state, ...patch } : state
    }
    let state: QuestState = {
      flags: { trolley_announced: true, stop_ok: true },
      questStep: 'show_time',
      gameClock: '13:30',
      currentZone: 'center',
    }
    expect(getArrowTarget(city, questline, state)).toEqual({ kind: 'door', id: 'door_tower' })

    state = step({ ...state, flags: { ...state.flags, task_show_time: true } }, { type: 'flag' })
    expect(state.questStep).toBe('dessert')
    expect(getArrowTarget(city, questline, state)).toEqual({ kind: 'door', id: 'door_cafe' })

    state = step({ ...state, flags: { ...state.flags, task_dessert: true } }, { type: 'flag' })
    expect(state.questStep).toBe('go_embankment')
    expect(state.gameClock).toBe('18:30')
    expect(getArrowTarget(city, questline, state)).toEqual({ kind: 'exit', id: 'exit_embankment' })

    state = step({ ...state, currentZone: 'embankment' }, { type: 'zoneEntered', zoneId: 'embankment' })
    expect(state.questStep).toBe('find_solomiia')
  })
})
