import type { Environment, Sky, Weather } from './types'
import {
  tempToHue, skyToChroma, lightnessFor, sunToWarmShift,
  visibilityToFogContrast, isNight, moonToLift,
} from './mappers'

export const deriveEnvironment = (weather: Weather, sky: Sky): Environment => ({
  hueDeg: tempToHue(weather.temperatureC),
  chroma: skyToChroma(weather.cloudCover, weather.precipitation),
  lightness: lightnessFor(weather.cloudCover, weather.precipitation, sky.sunElevationDeg),
  warmShift: sunToWarmShift(sky.sunElevationDeg),
  fogContrast: visibilityToFogContrast(weather.visibilityM),
  moonLift: moonToLift(sky.moonIllumination, isNight(sky.sunElevationDeg)),
})
