import type { LocalizedText } from './getCityConfig'

export interface QuestTarget {
  npcId?: string
  doorId?: string
  exitId?: string
  hidden?: boolean
}

export interface QuestCondition {
  flag?: string
  dialogueFinished?: string
  zoneEntered?: string
}

export interface QuestEffects {
  setFlag?: string
}

export interface QuestStep {
  id: string
  zone: string
  target: QuestTarget
  objective: LocalizedText
  completeWhen: QuestCondition
  startEffects?: QuestEffects
  completeEffects?: QuestEffects
  advanceClockTo?: string
}

export interface SideQuest {
  id: string
  optional: boolean
  zone: string
  target: QuestTarget
  completeWhen: QuestCondition
}

export interface Questline {
  id: string
  cityId: string
  steps: QuestStep[]
  sideQuests: SideQuest[]
}

const questModules = import.meta.glob<{ default: Questline }>(
  '../mocks/quests/*.json',
)

export async function getQuestline(questlineId: string): Promise<Questline> {
  const loadQuestline = questModules[`../mocks/quests/${questlineId}.json`]
  if (!loadQuestline) {
    throw new Error(`Unknown questline: ${questlineId}`)
  }
  const module = await loadQuestline()
  return module.default
}
