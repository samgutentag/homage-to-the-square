import { describe, it, expect } from 'vitest'
import { deriveEnvironment } from './environment'
import type { Weather, Sky } from './types'

const clearWeather: Weather = {
  temperatureC: 20, weatherCode: 0, cloudCover: 0, precipitation: 0,
  visibilityM: 20000, relativeHumidity: 40, isDay: true,
}

describe('deriveEnvironment', () => {
  it('composes all signals (clear midday)', () => {
    const sky: Sky = { sunElevationDeg: 40, moonIllumination: 0.5 }
    const env = deriveEnvironment(clearWeather, sky)
    expect(env.chroma).toBeGreaterThan(0.9)
    expect(env.lightness).toBeGreaterThan(0.7)
    expect(env.fogContrast).toBe(1)
    expect(env.warmShift).toBe(0)
    expect(env.moonLift).toBe(0)
  })
  it('applies moon lift and darkness at night', () => {
    const sky: Sky = { sunElevationDeg: -20, moonIllumination: 0.9 }
    const env = deriveEnvironment(clearWeather, sky)
    expect(env.moonLift).toBeCloseTo(0.9, 5)
    expect(env.lightness).toBeLessThan(0.2)
  })
})
