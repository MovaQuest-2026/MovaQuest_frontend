export interface CityConfig {
  id: string
  name: { en: string; uk: string }
  culturalIntro: { en: string; uk: string }
  tilemapKey: string
  npcs: { id: string; dialogueId: string }[]
}

const cityModules = import.meta.glob<{ default: CityConfig }>(
  '../mocks/cities/*.json',
)

export async function getCityConfig(cityId: string): Promise<CityConfig> {
  const loadCity = cityModules[`../mocks/cities/${cityId}.json`]
  if (!loadCity) {
    throw new Error(`Unknown city: ${cityId}`)
  }
  const module = await loadCity()
  return module.default
}
