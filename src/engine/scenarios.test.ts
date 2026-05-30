import { describe, it, expect } from 'vitest'
import { hourToElev, envFromSignals, SCENARIOS, timelineGradient } from './scenarios'

describe('hourToElev', () => {
  it('peaks at noon, troughs at midnight, zero at sunrise/sunset', () => {
    expect(hourToElev(12)).toBeCloseTo(60, 0)
    expect(hourToElev(0)).toBeCloseTo(-60, 0)
    expect(hourToElev(6)).toBeCloseTo(0, 1)
    expect(hourToElev(18)).toBeCloseTo(0, 1)
  })
})

describe('SCENARIOS', () => {
  it('has six scenarios with stable ids and loopable signals', () => {
    expect(SCENARIOS).toHaveLength(6)
    for (const s of SCENARIOS) {
      const start = s.at(0)
      const end = s.at(1)
      expect(start.hour).toBeCloseTo(end.hour, 5)
      expect(s.durationMs).toBeGreaterThan(0)
    }
  })
})

describe('envFromSignals', () => {
  it('produces a valid environment', () => {
    const env = envFromSignals(SCENARIOS[0].at(0.5))
    expect(env.chroma).toBeGreaterThanOrEqual(0)
    expect(env.lightness).toBeGreaterThanOrEqual(0)
  })
})

describe('timelineGradient', () => {
  it('builds a multi-stop linear-gradient string', () => {
    const g = timelineGradient(SCENARIOS[0])
    expect(g.startsWith('linear-gradient(90deg,')).toBe(true)
    expect(g).toContain('oklch(')
  })
})
