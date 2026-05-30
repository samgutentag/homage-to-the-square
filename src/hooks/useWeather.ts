import { useEffect, useState } from 'react'
import type { Weather } from '../engine/types'
import { fetchWeather } from '../data/weather'

const POLL_MS = 12 * 60 * 1000

interface WeatherState { weather: Weather | null; stale: boolean }

export const useWeather = (lat: number | null, lon: number | null): WeatherState => {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (lat == null || lon == null) return
    let cancelled = false
    const load = async () => {
      try {
        const w = await fetchWeather(lat, lon)
        if (!cancelled) { setWeather(w); setStale(false) }
      } catch {
        if (!cancelled) setStale(true)
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [lat, lon])

  return { weather, stale }
}
