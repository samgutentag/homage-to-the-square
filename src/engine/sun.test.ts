import { describe, it, expect } from 'vitest'
import { elevationFor, moonIlluminationFor } from './sun'

const LAT = 37.8
const LON = -122.27

describe('elevationFor', () => {
  it('is positive around local midday and negative around local midnight', () => {
    expect(elevationFor(new Date('2026-06-21T19:00:00Z'), LAT, LON)).toBeGreaterThan(0)
    expect(elevationFor(new Date('2026-06-21T08:00:00Z'), LAT, LON)).toBeLessThan(0)
  })
})

describe('moonIlluminationFor', () => {
  it('is within 0..1', () => {
    const m = moonIlluminationFor(new Date('2026-06-21T08:00:00Z'))
    expect(m).toBeGreaterThanOrEqual(0)
    expect(m).toBeLessThanOrEqual(1)
  })
})
