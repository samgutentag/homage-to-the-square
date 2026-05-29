import { useEffect, useState, useCallback } from 'react'
import type { ResolvedPlace } from '../engine/types'
import { ipLocate, geocodeCity } from '../data/location'

const DEFAULT_PLACE: ResolvedPlace = { lat: 37.77, lon: -122.42, name: 'San Francisco (default)' }

interface GeoState {
  place: ResolvedPlace | null
  error: string | null
  setCity: (name: string) => Promise<void>
}

const browserCoords = (): Promise<{ lat: number; lon: number }> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(e),
    )
  })

export const useGeolocation = (): GeoState => {
  const [place, setPlace] = useState<ResolvedPlace | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setCity = useCallback(async (name: string) => {
    try {
      setPlace(await geocodeCity(name))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { lat, lon } = await browserCoords()
        if (!cancelled) setPlace({ lat, lon, name: 'Your location' })
      } catch {
        try {
          const ip = await ipLocate()
          if (!cancelled) setPlace(ip)
        } catch (e) {
          if (!cancelled) {
            setError((e as Error).message)
            setPlace(DEFAULT_PLACE)
          }
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { place, error, setCity }
}
