import type { ResolvedPlace } from '../engine/types'

interface GeoHit {
  latitude: number
  longitude: number
  name: string
  admin1?: string
  country?: string
}

/** Open-Meteo geocoding search — up to 5 candidate places, name disambiguated by region + country. */
export const searchCities = async (name: string): Promise<ResolvedPlace[]> => {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`city search failed: ${res.status}`)
  const hits: GeoHit[] = (await res.json()).results ?? []
  return hits.map((h) => ({
    lat: h.latitude,
    lon: h.longitude,
    name: [h.name, h.admin1, h.country].filter(Boolean).join(', '),
  }))
}

