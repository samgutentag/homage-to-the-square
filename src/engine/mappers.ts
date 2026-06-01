import { clamp, clamp01, lerp } from './color'
import type { TempRange } from './types'

const COLD_HUE = 250
const HOT_HUE = 50

/** Wide global span used when no local climate range is supplied. */
export const DEFAULT_RANGE: TempRange = { coldC: -10, hotC: 35 }

export const tempToHue = (tempC: number, range: TempRange = DEFAULT_RANGE): number => {
  // A flat or inverted range (e.g. a degenerate daily forecast) would divide by zero
  // or flip the scale — fall back to the global span instead.
  const { coldC, hotC } = range.hotC > range.coldC ? range : DEFAULT_RANGE
  const t = clamp01((tempC - coldC) / (hotC - coldC))
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

/**
 * Vertical lift (%) applied to inner squares. Zero at night — the squares rest in
 * Albers' canonical pushed-down position — rising gently toward center at high sun.
 * Lifting (never pushing further down) keeps the bottom margin from getting snugger
 * than the real paintings.
 */
export const sunToLift = (elevationDeg: number): number =>
  lerp(0, 4, clamp01((elevationDeg + 10) / 70))
