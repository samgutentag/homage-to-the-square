import { describe, it, expect } from 'vitest'
import { buildComposition } from './composition'

describe('buildComposition', () => {
  it('returns four insets and four opacities', () => {
    const c = buildComposition(30, 40)
    expect(c.insets).toHaveLength(4)
    expect(c.opacities).toHaveLength(4)
  })
  it('keeps the innermost square solid at high humidity (4-square)', () => {
    expect(buildComposition(90, 40).opacities[3]).toBeCloseTo(1, 5)
  })
  it('fades the innermost square out at low humidity (3-square)', () => {
    expect(buildComposition(10, 40).opacities[3]).toBeCloseTo(0, 5)
  })
  it('low sun pushes the inner squares further down (larger top inset)', () => {
    const high = buildComposition(30, 60)
    const low = buildComposition(30, -10)
    expect(low.insets[1].top).toBeGreaterThan(high.insets[1].top)
  })
  it('the ground square is always full-bleed and opaque', () => {
    const c = buildComposition(50, 0)
    expect(c.insets[0]).toEqual({ top: 0, left: 0, right: 0, bottom: 0 })
    expect(c.opacities[0]).toBe(1)
  })
})
