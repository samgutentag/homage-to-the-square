import { useMemo } from 'react'
import type { Sky } from '../engine/types'
import { elevationFor, moonIlluminationFor } from '../engine/sun'

export const useSky = (date: Date, lat: number | null, lon: number | null): Sky | null =>
  useMemo(() => {
    if (lat == null || lon == null) return null
    return {
      sunElevationDeg: elevationFor(date, lat, lon),
      moonIllumination: moonIlluminationFor(date),
    }
  }, [date, lat, lon])
