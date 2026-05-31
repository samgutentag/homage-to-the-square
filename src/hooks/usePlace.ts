import { useState, useCallback } from 'react'
import type { ResolvedPlace } from '../engine/types'

const DEFAULT_PLACE: ResolvedPlace = { lat: 34.4208, lon: -119.6982, name: 'Santa Barbara, CA' }

interface PlaceState {
  place: ResolvedPlace
  selectPlace: (place: ResolvedPlace) => void
}

/** Current location: defaults to Santa Barbara; the city search picks others. */
export const usePlace = (): PlaceState => {
  const [place, setPlace] = useState<ResolvedPlace>(DEFAULT_PLACE)
  const selectPlace = useCallback((next: ResolvedPlace) => setPlace(next), [])
  return { place, selectPlace }
}
