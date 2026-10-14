import type { QuestFlags } from './quests/questEngine'

// Злива у Вишеньці: починається з rain_started (startEffects кроку wait_rain), минає з rain_over
// (completeEffects того ж кроку, після чаю в пані Галини).
// Дощ біля Мурів: rain_mury ставить тригер навколо художника, rain_mury_over — кінець діалогу center_artist.
export function isRainActive(flags: QuestFlags): boolean {
  const vyshenka = flags.rain_started === true && flags.rain_over !== true
  const mury = flags.rain_mury === true && flags.rain_mury_over !== true
  return vyshenka || mury
}
