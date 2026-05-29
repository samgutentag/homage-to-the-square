import type { ResolvedPlace } from '../engine/types'

export const geocodeCity = async (name: string): Promise<ResolvedPlace> => {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`geocode failed: ${res.status}`)
  const hit = (await res.json()).results?.[0]
  if (!hit) throw new Error(`no match for "${name}"`)
  return { lat: hit.latitude, lon: hit.longitude, name: [hit.name, hit.country].filter(Boolean).join(', ') }
}

export const ipLocate = async (): Promise<ResolvedPlace> => {
  const res = await fetch('https://ipapi.co/json/')
  if (!res.ok) throw new Error(`ip locate failed: ${res.status}`)
  const j = await res.json()
  return { lat: j.latitude, lon: j.longitude, name: [j.city, j.region].filter(Boolean).join(', ') }
}
