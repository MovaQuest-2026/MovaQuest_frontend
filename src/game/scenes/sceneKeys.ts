import type { ZoneConfig } from '../../api/getCityConfig'

export const WORLD_SCENE_KEY = 'world'
export const INTERIOR_SCENE_KEY = 'interior'
export const TRANSPORT_SCENE_KEY = 'transport'

export interface ZoneSceneData {
  zoneId: string
}

export function sceneKeyForZone(zone: ZoneConfig) {
  if (zone.type === 'interior') return INTERIOR_SCENE_KEY
  if (zone.type === 'transport') return TRANSPORT_SCENE_KEY
  return WORLD_SCENE_KEY
}
