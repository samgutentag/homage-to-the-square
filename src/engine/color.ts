import type { OklchColor } from './types'

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v))
export const clamp01 = (v: number): number => clamp(v, 0, 1)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const oklchCss = (c: OklchColor): string =>
  `oklch(${c.l.toFixed(4)} ${c.c.toFixed(4)} ${c.h.toFixed(2)})`

export const rotateHueToward = (from: number, to: number, t: number): number => {
  const delta = ((to - from + 540) % 360) - 180
  const result = from + delta * t
  return ((result % 360) + 360) % 360
}
