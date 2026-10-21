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
  // Одяг: окремий LPC-спрайт public/assets/lpc/<outfit>.png, має пріоритет над sprite.
  outfit?: string
  // id LPC-спрайтшита public/assets/lpc/<sprite>.png; без нього — плейсхолдер.
  sprite?: string
  // id дверей або виходу: поки з NPC іде діалог, сцена малює до них пунктир (реверс-квест туриста).
  showRouteTo?: string
  // Статичний спрайт public/assets/characters/<character>.png (один кадр у нативному розмірі); найвищий пріоритет.
  character?: string
  // Без спрайта і привітання над головою, але із зоною взаємодії і підписом у InteractionHint.
  invisible?: boolean
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
  // i18n-ключ підказки, яку показуємо біля закритого виходу.
  lockedHint?: string
  spawn: Point
  // Підпис над виходом, щоб перехід було видно.
  label?: LocalizedText
  // Вікно підтвердження перед переходом (ключі i18n).
  confirm?: ExitConfirmConfig
  setFlagOnConfirm?: string
  setClockOnConfirm?: string
}

export interface ExitConfirmConfig {
  titleKey: string
  bodyKey: string
  confirmKey: string
  cancelKey: string
}

// Невидима зона: коли гравець у неї входить, ставиться flags[setFlag] = true.
export interface TriggerConfig {
  id: string
  x: number
  y: number
  w: number
  h: number
  setFlag: string
}

// Зображення public/assets/landmarks/<id>.png, x/y — точка посередині нижнього краю.
export interface LandmarkConfig {
  id: string
  image: string
  x: number
  y: number
  scale?: number
}

// Зображення public/assets/backgrounds/<image>.png замість тайлмапи; width/height — розмір світу в пікселях.
export interface BackgroundConfig {
  image: string
  width: number
  height: number
  // Заливка екрана, якщо світ менший за вікно.
  fillColor?: string
}

// Невидима статична перешкода для зони з background.
export interface ColliderConfig {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface ZoneConfig {
  id: string
  type: 'outdoor' | 'interior' | 'transport'
  // Зона має або tilemap, або background.
  tilemap?: string
  background?: BackgroundConfig
  colliders?: ColliderConfig[]
  spawn: Point
  onEnterDialogue?: string
  npcs: CityNpcConfig[]
  doors: DoorConfig[]
  exits: ExitConfig[]
  landmarks?: LandmarkConfig[]
  triggers?: TriggerConfig[]
}

// Заставка перед першим входом у зону (наприклад, пролог галявини).
export interface ZoneIntro {
  title: LocalizedText
  text: LocalizedText
}

export interface CityConfig {
  id: string
  name: LocalizedText
  culturalIntro: LocalizedText
  startZone: string
  // Ігровий час нової гри; без значення лишається 09:00.
  startClock?: string
  // level — після фіналу екран завершення рівня, без значення — «Щоденник дня».
  completion?: 'level'
  // Стартова зона для мови інтерфейсу; без запису береться startZone.
  startZoneByLanguage?: Partial<Record<'en' | 'uk', string>>
  // id спрайта public/assets/characters/<id>.png для головного героя в усіх зонах.
  playerCharacter?: string
  // Заставки за id зони; для startZone без запису показується назва міста і culturalIntro.
  zoneIntros?: Record<string, ZoneIntro>
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
  for (const zone of raw.zones) {
    if (Boolean(zone.tilemap) === Boolean(zone.background)) {
      throw new Error(
        `Zone ${zone.id} in city ${cityId} must have exactly one of tilemap or background`,
      )
    }
  }
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
