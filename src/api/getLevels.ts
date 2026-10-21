import type { LocalizedText } from './getCityConfig'
import levelsData from '../mocks/levels.json'

export interface LevelInfo {
  // id у роуті /levels/:levelId.
  id: string
  cityId: string
  order: number
  // Основний рівень: показується першим і виділяється в списку.
  main: boolean
  // Прихований рівень не показується у списку, але відкривається за прямим роутом /levels/:levelId.
  hidden?: boolean
  minutes: string
  title: LocalizedText
  description: LocalizedText
}

const levels: LevelInfo[] = [...(levelsData as LevelInfo[])].sort(
  (a, b) => a.order - b.order,
)

export async function getLevels(): Promise<LevelInfo[]> {
  return levels.filter((level) => !level.hidden)
}

export async function getLevel(levelId: string): Promise<LevelInfo | null> {
  return levels.find((level) => level.id === levelId) ?? null
}
