import type { Composition, Inset } from './types'
import { clamp01, lerp } from './color'
import { sunToLift } from './mappers'

const ground: Inset = { top: 0, left: 0, right: 0, bottom: 0 }

// Albers' documented grid: squares 10/8/6/4 units, 1-unit side gaps, each ½-unit
// lower than the next larger — giving every border a bottom:sides:top ratio of 1:2:3.
const T4: Inset[] = [
  ground,
  { top: 15, left: 10, right: 10, bottom: 5 },
  { top: 30, left: 20, right: 20, bottom: 10 },
  { top: 45, left: 30, right: 30, bottom: 15 },
]
// Three-square format: squares 10/7/4, same ½-unit downward steps. The 4th entry is
// the fade target for the innermost square as it dissolves on the way to 3 squares.
const T3: Inset[] = [
  ground,
  { top: 20, left: 15, right: 15, bottom: 10 },
  { top: 40, left: 30, right: 30, bottom: 20 },
  { top: 50, left: 40, right: 40, bottom: 30 },
]

const lerpInset = (a: Inset, b: Inset, t: number): Inset => ({
  top: lerp(a.top, b.top, t),
  left: lerp(a.left, b.left, t),
  right: lerp(a.right, b.right, t),
  bottom: lerp(a.bottom, b.bottom, t),
})

export const buildComposition = (humidity: number, sunElevationDeg: number): Composition => {
  // High humidity → 4 squares (t=0, T4); low humidity → 3 squares (t=1, T3).
  const t = clamp01((65 - humidity) / 30)
  const lift = sunToLift(sunElevationDeg)
  const insets: Inset[] = T4.map((a, i) => {
    const blended = i === 0 ? ground : lerpInset(a, T3[i], t)
    if (i === 0) return blended
    // Lift the stack toward center at high sun; never below the authentic baseline.
    return { ...blended, top: Math.max(2, blended.top - lift), bottom: blended.bottom + lift }
  })
  return { insets, opacities: [1, 1, 1, 1 - t] }
}
