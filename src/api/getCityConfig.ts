export interface LocalizedText {
  en: string
  uk: string
}

export interface Point {
  x: number
  y: number
}

export interface CityNpcConfig {
  id: string
  name: LocalizedText
  dialogueId: string
  zone: string
  x: number
  y: number
  patrol: boolean
  outfit?: string
  // id LPC-спрайтшита public/assets/lpc/<sprite>.png; без нього — плейсхолдер.
  sprite?: string
}

export interface DoorConfig {
  id: string
  target: string
  x: number
  y: number
  w: number
  h: number
  requiresFlag?: string
  spawn: Point
}

export interface ExitConfig {
  id: string
  target: string
  x: number
  y: number
  w: number
  h: number
  requiresFlag?: string
  requiresFlagFalse?: string
  spawn: Point
}

// Зображення public/assets/landmarks/<id>.png, x/y — точка посередині нижнього краю.
export interface LandmarkConfig {
  id: string
  image: string
  x: number
  y: number
  scale?: number
}

export interface ZoneConfig {
  id: string
  type: 'outdoor' | 'interior' | 'transport'
  tilemap: string
  spawn: Point
  onEnterDialogue?: string
  npcs: CityNpcConfig[]
  doors: DoorConfig[]
  exits: ExitConfig[]
  landmarks?: LandmarkConfig[]
}

export interface CityConfig {
  id: string
  name: LocalizedText
  culturalIntro: LocalizedText
  startZone: string
  questlineId: string
  zones: ZoneConfig[]
}

type RawNpcConfig = Omit<CityNpcConfig, 'zone'>
type RawZoneConfig = Omit<ZoneConfig, 'npcs'> & { npcs: RawNpcConfig[] }
type RawCityConfig = Omit<CityConfig, 'zones'> & { zones: RawZoneConfig[] }

const cityModules = import.meta.glob<{ default: RawCityConfig }>(
  '../mocks/cities/*.json',
)

export async function getCityConfig(cityId: string): Promise<CityConfig> {
  const loadCity = cityModules[`../mocks/cities/${cityId}.json`]
  if (!loadCity) {
    throw new Error(`Unknown city: ${cityId}`)
  }
  const module = await loadCity()
  const raw = module.default
  // У JSON зона NPC задається вкладеністю; в API вона явне поле, щоб NPC можна було передавати окремо від зони.
  return {
    ...raw,
    zones: raw.zones.map((zone) => ({
      ...zone,
      npcs: zone.npcs.map((npc) => ({ ...npc, zone: zone.id })),
    })),
  }
}

export function getZone(city: CityConfig, zoneId: string): ZoneConfig {
  const zone = city.zones.find((candidate) => candidate.id === zoneId)
  if (!zone) {
    throw new Error(`Unknown zone: ${zoneId} in city ${city.id}`)
  }
  return zone
}
