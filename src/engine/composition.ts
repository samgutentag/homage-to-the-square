import type { Composition, Inset } from './types'
import { clamp01, lerp } from './color'
import { sunToOffset } from './mappers'

const ground: Inset = { top: 0, left: 0, right: 0, bottom: 0 }

const T4: Inset[] = [
  ground,
  { top: 14, left: 11, right: 11, bottom: 8 },
  { top: 29, left: 22, right: 22, bottom: 15 },
  { top: 43, left: 33, right: 33, bottom: 23 },
]
const T3: Inset[] = [
  ground,
  { top: 18, left: 14, right: 14, bottom: 10 },
  { top: 39, left: 30, right: 30, bottom: 21 },
  { top: 49, left: 39, right: 39, bottom: 29 },
]

const lerpInset = (a: Inset, b: Inset, t: number): Inset => ({
  top: lerp(a.top, b.top, t),
  left: lerp(a.left, b.left, t),
  right: lerp(a.right, b.right, t),
  bottom: lerp(a.bottom, b.bottom, t),
})

export const buildComposition = (humidity: number, sunElevationDeg: number): Composition => {
  const t = clamp01((humidity - 35) / 30)
  const shift = sunToOffset(sunElevationDeg)
  const insets: Inset[] = T4.map((a, i) => {
    const blended = i === 0 ? ground : lerpInset(a, T3[i], t)
    if (i === 0) return blended
    return { ...blended, top: blended.top + shift, bottom: Math.max(2, blended.bottom - shift) }
  })
  return { insets, opacities: [1, 1, 1, 1 - t] }
}
