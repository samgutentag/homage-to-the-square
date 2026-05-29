import type { Environment, OklchColor } from './types'
import { clamp, rotateHueToward } from './color'

const WARM_TARGET_HUE = 70

export const buildPalette = (env: Environment): OklchColor[] => {
  const baseL = 0.2 + env.lightness * 0.45
  const step = 0.12 * env.fogContrast
  const baseChroma = 0.02 + env.chroma * 0.16
  const hue = rotateHueToward(env.hueDeg, WARM_TARGET_HUE, env.warmShift * 0.6)

  const colors: OklchColor[] = []
  for (let i = 0; i < 4; i++) {
    const l = baseL + i * step
    const c = Math.max(0, baseChroma * (1 - i * 0.12))
    const h = (((hue + i * 6) % 360) + 360) % 360
    colors.push({ l: clamp(l, 0.05, 0.97), c, h })
  }
  if (env.moonLift > 0) {
    const inner = colors[3]
    inner.l = clamp(inner.l + env.moonLift * 0.25, 0.05, 0.97)
    inner.c = inner.c + env.moonLift * 0.03
  }
  return colors
}
