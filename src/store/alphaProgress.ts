import type { FlagValue } from './useGameStore'

const ALPHA_STATION_FLAGS = ['alpha_easy', 'alpha_new', 'alpha_special'] as const

export const ALPHA_STATION_COUNT = ALPHA_STATION_FLAGS.length
export const ALPHA_QUESTION_COUNT = 9

// Прогрес абетки на галявині: скільки станцій з трьох пройдено і скільки відповідей правильних.
export function getAlphaProgress(flags: Record<string, FlagValue>) {
  return {
    stationsDone: ALPHA_STATION_FLAGS.filter((flag) => flags[flag] === true).length,
    alphaScore: Number(flags.alpha_score ?? 0),
  }
}
