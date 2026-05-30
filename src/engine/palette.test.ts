import { describe, it, expect } from 'vitest'
import { buildPalette } from './palette'
import type { Environment } from './types'

const env: Environment = {
  hueDeg: 200, chroma: 0.7, lightness: 0.5, warmShift: 0, fogContrast: 1, moonLift: 0,
}

describe('buildPalette', () => {
  it('returns four colors', () => { expect(buildPalette(env)).toHaveLength(4) })
  it('produces a monotonic lightness ramp', () => {
    const p = buildPalette(env)
    for (let i = 1; i < p.length; i++) expect(p[i].l).toBeGreaterThan(p[i - 1].l)
  })
  it('fog compresses the lightness spread', () => {
    const spread = (p: { l: number }[]) => p[3].l - p[0].l
    expect(spread(buildPalette({ ...env, fogContrast: 0.2 }))).toBeLessThan(
      spread(buildPalette({ ...env, fogContrast: 1 })),
    )
  })
  it('higher chroma yields more saturation', () => {
    expect(buildPalette({ ...env, chroma: 0.9 })[0].c).toBeGreaterThan(
      buildPalette({ ...env, chroma: 0.1 })[0].c,
    )
  })
  it('moon lift raises the innermost square', () => {
    expect(buildPalette({ ...env, lightness: 0.12, moonLift: 0.9 })[3].l).toBeGreaterThan(
      buildPalette({ ...env, lightness: 0.12, moonLift: 0 })[3].l,
    )
  })
  it('keeps channels in bounds', () => {
    for (const c of buildPalette({ ...env, lightness: 0.95, moonLift: 1 })) {
      expect(c.l).toBeGreaterThanOrEqual(0.05)
      expect(c.l).toBeLessThanOrEqual(0.97)
      expect(c.c).toBeGreaterThanOrEqual(0)
      expect(c.h).toBeGreaterThanOrEqual(0)
      expect(c.h).toBeLessThan(360)
    }
  })
})
