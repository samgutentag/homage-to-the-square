import { describe, it, expect } from 'vitest'
import { clamp, clamp01, lerp, oklchCss, rotateHueToward } from './color'

describe('clamp / clamp01 / lerp', () => {
  it('clamps and interpolates', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
})

describe('oklchCss', () => {
  it('formats an OKLCH string', () => {
    expect(oklchCss({ l: 0.5, c: 0.1, h: 120 })).toBe('oklch(0.5000 0.1000 120.00)')
  })
})

describe('rotateHueToward', () => {
  it('returns source at t=0 and target at t=1', () => {
    expect(rotateHueToward(200, 70, 0)).toBe(200)
    expect(rotateHueToward(200, 70, 1)).toBeCloseTo(70, 5)
  })
  it('takes the shortest path across 0/360', () => {
    expect(rotateHueToward(350, 10, 0.5)).toBeCloseTo(0, 5)
  })
})
