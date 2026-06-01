import { useEffect, useState } from 'react'
import type { ClimateRanges } from '../engine/types'
import { fetchClimateRange } from '../data/climate'

const keyFor = (lat: number, lon: number) => `clim:v1:${lat.toFixed(2)},${lon.toFixed(2)}`

const readCache = (key: string): ClimateRanges | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as ClimateRanges) : null
  } catch {
    return null
  }
}

const writeCache = (key: string, value: ClimateRanges): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode / quota — caching is a nicety, not a requirement.
  }
}

/**
 * Per-location historical temperature ranges. Returns null until first resolved;
 * callers fall back to the global range while null. Cached in localStorage since
 * climate normals barely move.
 */
export const useClimateRange = (lat: number | null, lon: number | null): ClimateRanges | null => {
  const [ranges, setRanges] = useState<ClimateRanges | null>(null)

  useEffect(() => {
    if (lat == null || lon == null) return
    const key = keyFor(lat, lon)
    const cached = readCache(key)
    // Resolve cache and network through one async path, so state is only ever set
    // asynchronously (never synchronously inside the effect body).
    const load = cached
      ? Promise.resolve(cached)
      : fetchClimateRange(lat, lon).then((r) => { writeCache(key, r); return r })

    let cancelled = false
    load
      .then((r) => { if (!cancelled) setRanges(r) })
      .catch(() => {
        // Leave ranges null → live painting uses the global default range.
      })
    return () => { cancelled = true }
  }, [lat, lon])

  return ranges
}
