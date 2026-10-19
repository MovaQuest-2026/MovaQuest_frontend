// Квест-двигун: чиста логіка без Phaser і React. Отримує стан і подію, повертає зміни для стору.
import type {
  CityConfig,
  DoorConfig,
  ExitConfig,
} from '../../api/getCityConfig'
import type {
  QuestCondition,
  QuestEffects,
  QuestStep,
  QuestTarget,
  Questline,
} from '../../api/getQuestline'

export type QuestFlags = Record<string, boolean | number | string>

export interface QuestState {
  flags: QuestFlags
  questStep: string | null
  gameClock: string
  currentZone: string | null
}

export type QuestEvent =
  | { type: 'flag' }
  | { type: 'dialogueFinished'; dialogueId: string }
  | { type: 'zoneEntered'; zoneId: string }

export type QuestPatch = Pick<QuestState, 'flags' | 'questStep' | 'gameClock'>

// questStep: null — квест ще не почався; QUEST_COMPLETE — усі кроки пройдено.
export const QUEST_COMPLETE = '__complete__'

export function getCurrentStep(
  questline: Questline,
  state: Pick<QuestState, 'questStep'>,
): QuestStep | null {
  return questline.steps.find((step) => step.id === state.questStep) ?? null
}

function isConditionMet(
  condition: QuestCondition,
  state: QuestState,
  event: QuestEvent | null,
): boolean {
  if (condition.flag !== undefined) {
    return state.flags[condition.flag] === true
  }
  if (condition.dialogueFinished !== undefined) {
    return (
      event?.type === 'dialogueFinished' &&
      event.dialogueId === condition.dialogueFinished
    )
  }
  if (condition.zoneEntered !== undefined) {
    // Перевіряємо за станом, а не тільки за подією, щоб крок закривався і після F5.
    return state.currentZone === condition.zoneEntered
  }
  return false
}

function applyEffects(flags: QuestFlags, effects?: QuestEffects): QuestFlags {
  if (!effects?.setFlag) return flags
  return { ...flags, [effects.setFlag]: true }
}

/**
 * Застосовує подію до квесту. Закриває поточний крок, якщо виконано completeWhen,
 * застосовує completeEffects і advanceClockTo, переходить до наступного кроку і
 * застосовує його startEffects. Кроки, умови яких уже виконані, закриваються ланцюжком.
 * Повертає null, якщо нічого не змінилося.
 */
export function evaluate(
  questline: Questline,
  state: QuestState,
  event: QuestEvent,
): QuestPatch | null {

  let current: QuestState = { ...state }
  let pendingEvent: QuestEvent | null = event
  let changed = false

  if (event.type === 'dialogueFinished') {
    for (const effect of questline.dialogueEffects ?? []) {
      if (effect.dialogueFinished !== event.dialogueId) continue
      if (current.flags[effect.setFlag] === true) continue
      current = { ...current, flags: { ...current.flags, [effect.setFlag]: true } }
      changed = true
    }
  }

  if (current.questStep === QUEST_COMPLETE || questline.steps.length === 0) {
    return changed ? pick(current) : null
  }

  if (current.questStep === null || !getCurrentStep(questline, current)) {
    const first = questline.steps[0]
    current = {
      ...current,
      questStep: first.id,
      flags: applyEffects(current.flags, first.startEffects),
    }
    changed = true
  }

  for (let guard = 0; guard <= questline.steps.length; guard++) {
    const index = questline.steps.findIndex(
      (step) => step.id === current.questStep,
    )
    const step = questline.steps[index]
    if (!step) break
    const skipped = step.skipWhen ? isConditionMet(step.skipWhen, current, null) : false
    if (!skipped && !isConditionMet(step.completeWhen, current, pendingEvent)) {
      break
    }

    // Подія завершення діалогу закриває не більше одного кроку (пропущений крок подію не споживає).
    if (!skipped && pendingEvent?.type === 'dialogueFinished') pendingEvent = null

    const next = questline.steps[index + 1]
    let flags = skipped ? current.flags : applyEffects(current.flags, step.completeEffects)
    if (next) flags = applyEffects(flags, next.startEffects)
    current = {
      ...current,
      flags,
      gameClock: skipped ? current.gameClock : (step.advanceClockTo ?? current.gameClock),
      questStep: next ? next.id : QUEST_COMPLETE,
    }
    changed = true
    if (!next) break
  }

  return changed ? pick(current) : null
}

function pick(state: QuestState): QuestPatch {
  return {
    flags: state.flags,
    questStep: state.questStep,
    gameClock: state.gameClock,
  }
}

/**
 * Примусово завершує поточний крок (для DebugPanel): ставить прапорець з completeWhen
 * або імітує подію і проганяє evaluate. Квест, що не почався, стартує.
 */
export function skipStep(questline: Questline, state: QuestState): QuestPatch | null {
  const step = getCurrentStep(questline, state)
  if (!step) return evaluate(questline, state, { type: 'flag' })

  const { flag, dialogueFinished, zoneEntered } = step.completeWhen
  const flags = flag ? { ...state.flags, [flag]: true } : state.flags
  const event: QuestEvent = dialogueFinished
    ? { type: 'dialogueFinished', dialogueId: dialogueFinished }
    : { type: 'flag' }
  return evaluate(
    questline,
    { ...state, flags, currentZone: zoneEntered ?? state.currentZone },
    event,
  )
}

/** Id кроків між двома значеннями questStep (не включаючи новий) — тобто завершені за одну зміну. */
export function completedStepIds(
  questline: Questline,
  previous: string | null,
  next: string | null,
): string[] {
  if (previous === null || previous === next) return []
  const from = questline.steps.findIndex((step) => step.id === previous)
  if (from === -1) return []
  const to =
    next === QUEST_COMPLETE
      ? questline.steps.length
      : questline.steps.findIndex((step) => step.id === next)
  if (to <= from) return []
  return questline.steps.slice(from, to).map((step) => step.id)
}

export function isGateOpen(
  gate: Pick<ExitConfig, 'requiresFlag' | 'requiresFlagFalse'>,
  flags: QuestFlags,
): boolean {
  if (gate.requiresFlag && flags[gate.requiresFlag] !== true) return false
  if (gate.requiresFlagFalse && flags[gate.requiresFlagFalse] === true) {
    return false
  }
  return true
}

export interface ArrowTarget {
  kind: 'npc' | 'door' | 'exit'
  id: string
}

interface TargetLocation extends ArrowTarget {
  zoneId: string
}

function findTarget(
  city: CityConfig,
  target: QuestTarget,
  preferredZone: string,
): TargetLocation | null {
  // Id дверей не унікальні між зонами (door_out), тому спершу шукаємо в зоні кроку.
  const zones = [...city.zones].sort(
    (a, b) => Number(b.id === preferredZone) - Number(a.id === preferredZone),
  )
  for (const zone of zones) {
    if (target.npcId && zone.npcs.some((npc) => npc.id === target.npcId)) {
      return { kind: 'npc', id: target.npcId, zoneId: zone.id }
    }
    if (target.doorId && zone.doors.some((door) => door.id === target.doorId)) {
      return { kind: 'door', id: target.doorId, zoneId: zone.id }
    }
    if (target.exitId && zone.exits.some((exit) => exit.id === target.exitId)) {
      return { kind: 'exit', id: target.exitId, zoneId: zone.id }
    }
  }
  return null
}

/**
 * Перші двері або вихід на найкоротшому шляху між зонами (пошук у ширину).
 * Якщо передано flags, спершу шукаємо шлях тільки через відкриті проходи — так стрілка
 * в тролейбусі вказує на той вихід, що справді відкрився. Немає відкритого шляху — шукаємо будь-який.
 */
export function findGateTowards(
  city: CityConfig,
  fromZone: string,
  toZone: string,
  flags?: QuestFlags,
): ArrowTarget | null {
  if (flags) {
    const open = searchGate(city, fromZone, toZone, (gate) => isGateOpen(gate, flags))
    if (open) return open
  }
  return searchGate(city, fromZone, toZone, () => true)
}

function searchGate(
  city: CityConfig,
  fromZone: string,
  toZone: string,
  canPass: (gate: DoorConfig | ExitConfig) => boolean,
): ArrowTarget | null {
  const firstGate = new Map<string, ArrowTarget>()
  const queue = [fromZone]
  const visited = new Set([fromZone])

  while (queue.length > 0) {
    const zoneId = queue.shift()!
    if (zoneId === toZone) return firstGate.get(zoneId) ?? null
    const zone = city.zones.find((candidate) => candidate.id === zoneId)
    if (!zone) continue

    const gates: { kind: ArrowTarget['kind']; gate: DoorConfig | ExitConfig }[] = [
      ...zone.doors.map((door) => ({ kind: 'door' as const, gate: door })),
      ...zone.exits.map((exit) => ({ kind: 'exit' as const, gate: exit })),
    ]
    for (const { kind, gate } of gates) {
      if (visited.has(gate.target) || !canPass(gate)) continue
      visited.add(gate.target)
      firstGate.set(
        gate.target,
        firstGate.get(zoneId) ?? { kind, id: gate.id },
      )
      queue.push(gate.target)
    }
  }
  return null
}

/** Куди в поточній зоні має показувати стрілка квесту, або null, якщо стрілки немає. */
export function getArrowTarget(
  city: CityConfig,
  questline: Questline,
  state: QuestState,
): ArrowTarget | null {
  const step = getCurrentStep(questline, state)
  if (!step || step.target.hidden || !state.currentZone) return null

  const location = findTarget(city, step.target, step.zone)
  if (!location) return null
  if (location.zoneId === state.currentZone) {
    return { kind: location.kind, id: location.id }
  }
  return findGateTowards(city, state.currentZone, location.zoneId, state.flags)
}
