import type { QuestFlags } from './quests/questEngine'

// Злива: починається з rain_started (startEffects кроку wait_rain), минає з rain_over
// (completeEffects того ж кроку, після чаю в пані Галини).
export function isRainActive(flags: QuestFlags): boolean {
  return flags.rain_started === true && flags.rain_over !== true
}
