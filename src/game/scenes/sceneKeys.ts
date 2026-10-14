import type { ZoneConfig } from '../../api/getCityConfig'

export const WORLD_SCENE_KEY = 'world'
export const INTERIOR_SCENE_KEY = 'interior'

export interface ZoneSceneData {
  zoneId: string
}

export function sceneKeyForZone(zone: ZoneConfig) {
  return zone.type === 'interior' ? INTERIOR_SCENE_KEY : WORLD_SCENE_KEY
}
