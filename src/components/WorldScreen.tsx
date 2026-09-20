import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCityConfig, type CityConfig } from '../api/getCityConfig'
import { useGameStore } from '../store/useGameStore'

export function WorldScreen() {
  const { cityId } = useParams<{ cityId: string }>()
  const nativeLanguage = useGameStore((state) => state.nativeLanguage)
  const setCurrentCity = useGameStore((state) => state.setCurrentCity)
  const [city, setCity] = useState<CityConfig | null>(null)

  useEffect(() => {
    if (!cityId) return

    let cancelled = false
    getCityConfig(cityId).then((config) => {
      if (!cancelled) setCity(config)
    })

    return () => {
      cancelled = true
    }
  }, [cityId])

  useEffect(() => {
    setCurrentCity(cityId ?? null)
    return () => setCurrentCity(null)
  }, [cityId, setCurrentCity])

  if (!city) {
    return <div className="screen world-screen" />
  }

  const lang = nativeLanguage ?? 'en'

  return (
    <div className="screen world-screen">
      <h1>{city.name[lang]}</h1>
      <p>{city.culturalIntro[lang]}</p>
    </div>
  )
}
