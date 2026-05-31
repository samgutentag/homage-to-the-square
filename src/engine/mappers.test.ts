import { describe, it, expect } from 'vitest'
import {
  tempToHue, skyToChroma, skyDayLightness, lightnessFor,
  sunToWarmShift, visibilityToFogContrast, isNight, moonToLift, sunToLift,
} from './mappers'

describe('tempToHue', () => {
  it('cold -> cool, hot -> warm, clamped', () => {
    expect(tempToHue(-10)).toBeCloseTo(250, 0)
    expect(tempToHue(35)).toBeCloseTo(50, 0)
    expect(tempToHue(0)).toBeGreaterThan(tempToHue(20))
    expect(tempToHue(-50)).toBeCloseTo(250, 0)
    expect(tempToHue(99)).toBeCloseTo(50, 0)
  })
})

describe('skyToChroma', () => {
  it('high when clear, low when overcast', () => {
    expect(skyToChroma(0, 0)).toBeGreaterThan(0.9)
    expect(skyToChroma(100, 0)).toBeLessThan(0.3)
    expect(skyToChroma(50, 5)).toBeLessThan(skyToChroma(50, 0))
  })
})

describe('skyDayLightness', () => {
  it('bright when clear, dark when overcast', () => {
    expect(skyDayLightness(0, 0)).toBeCloseTo(0.8, 1)
    expect(skyDayLightness(100, 0)).toBeLessThan(0.45)
  })
})

describe('lightnessFor (day/night gate)', () => {
  it('is dark at night regardless of weather', () => {
    expect(lightnessFor(0, 0, -30)).toBeLessThan(0.2)
  })
  it('matches daytime sky brightness when the sun is well up', () => {
    expect(lightnessFor(0, 0, 40)).toBeCloseTo(0.8, 1)
  })
  it('does not change with sun height once the sun is well up', () => {
    expect(lightnessFor(0, 0, 20)).toBeCloseTo(lightnessFor(0, 0, 60), 5)
  })
})

describe('sunToWarmShift', () => {
  it('peaks at the horizon, zero high or deep', () => {
    expect(sunToWarmShift(0)).toBeCloseTo(1, 5)
    expect(sunToWarmShift(45)).toBe(0)
    expect(sunToWarmShift(-30)).toBe(0)
  })
})

describe('visibilityToFogContrast', () => {
  it('full in clear air, compressed in fog, never zero', () => {
    expect(visibilityToFogContrast(20000)).toBe(1)
    const fog = visibilityToFogContrast(200)
    expect(fog).toBeLessThan(0.3)
    expect(fog).toBeGreaterThan(0)
  })
})

describe('isNight / moonToLift', () => {
  it('night below civil twilight; moon lifts only at night', () => {
    expect(isNight(-10)).toBe(true)
    expect(isNight(5)).toBe(false)
    expect(moonToLift(0.8, true)).toBeCloseTo(0.8, 5)
    expect(moonToLift(1, false)).toBe(0)
  })
})

describe('sunToLift', () => {
  it('is zero at night and lifts at high sun', () => {
    expect(sunToLift(-10)).toBeCloseTo(0, 1)
    expect(sunToLift(60)).toBeCloseTo(4, 1)
  })
})
