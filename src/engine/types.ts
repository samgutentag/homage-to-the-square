export interface Weather {
  temperatureC: number
  weatherCode: number
  cloudCover: number // 0..100
  precipitation: number // mm
  visibilityM: number // meters
  relativeHumidity: number // 0..100
  isDay: boolean
  highC: number // today's forecast high
  lowC: number // today's forecast low
  dailyCode: number // today's forecast WMO weather code
}

export interface Sky {
  sunElevationDeg: number // -90..90
  moonIllumination: number // 0..1
}

export interface Environment {
  hueDeg: number
  chroma: number // 0..1
  lightness: number // 0..1
  warmShift: number // 0..1
  fogContrast: number // 0..1
  moonLift: number // 0..1
}

export interface OklchColor { l: number; c: number; h: number }

export interface Inset { top: number; left: number; right: number; bottom: number } // percent

/** Always 4 squares; opacities[3] fades toward 0 as the 3-square format takes over. */
export interface Composition { insets: Inset[]; opacities: number[] }

export interface ResolvedPlace { lat: number; lon: number; name: string }

export type ViewMode = 'live' | 'about'

/** Which climatological window the temperature→hue scale stretches across. */
export type ScalingMode = 'daily' | 'monthly' | 'annual'

/** Temperature endpoints (°C) the hue scale maps onto blue→warm. */
export interface TempRange { coldC: number; hotC: number }

/** Per-location climate ranges derived from the historical archive. */
export interface ClimateRanges { annual: TempRange; monthly: TempRange[] } // monthly: length 12, index = month 0–11

/** Canonical (metric) signal values a scenario emits at a point in its loop. */
export interface ScenarioSignals {
  hour: number // 0..24
  tempC: number
  cloud: number // 0..100
  precipMm: number
  visM: number
  moon: number // 0..1
  humidity: number // 0..100
}

export interface Scenario {
  id: string
  name: string
  durationMs: number
  at: (p: number) => ScenarioSignals
}
