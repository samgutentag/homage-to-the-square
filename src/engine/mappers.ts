import { clamp, clamp01, lerp } from './color'

const COLD_HUE = 250
const HOT_HUE = 50
const COLD_TEMP = -10
const HOT_TEMP = 35

export const tempToHue = (tempC: number): number => {
  const t = clamp01((tempC - COLD_TEMP) / (HOT_TEMP - COLD_TEMP))
  return COLD_HUE + t * (HOT_HUE - COLD_HUE)
}

export const grayness = (cloudCover: number, precipitation: number): number =>
  clamp01((cloudCover / 100) * 0.8 + (precipitation / 10) * 0.5)

export const skyToChroma = (cloudCover: number, precipitation: number): number =>
  clamp01(1 - grayness(cloudCover, precipitation))

export const skyDayLightness = (cloudCover: number, precipitation: number): number =>
  lerp(0.8, 0.34, grayness(cloudCover, precipitation))

export const dayness = (elevationDeg: number): number => clamp01((elevationDeg + 6) / 12)

export const lightnessFor = (
  cloudCover: number,
  precipitation: number,
  elevationDeg: number,
): number => lerp(0.14, skyDayLightness(cloudCover, precipitation), dayness(elevationDeg))

export const sunToWarmShift = (elevationDeg: number): number =>
  Math.max(0, 1 - Math.abs(elevationDeg) / 10)

export const visibilityToFogContrast = (visibilityM: number): number =>
  clamp(visibilityM / 10000, 0.15, 1)

export const isNight = (elevationDeg: number): boolean => elevationDeg < -6

export const moonToLift = (illumination: number, night: boolean): number =>
  night ? clamp01(illumination) : 0

export const sunToOffset = (elevationDeg: number): number =>
  lerp(8, 0, clamp01((elevationDeg + 10) / 70))
