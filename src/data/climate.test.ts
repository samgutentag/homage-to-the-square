import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchClimateRange, percentile } from './climate'

afterEach(() => vi.restoreAllMocks())

describe('percentile', () => {
  it('returns the endpoints at 0 and 100', () => {
    expect(percentile([10, 20, 30, 40], 0)).toBe(10)
    expect(percentile([10, 20, 30, 40], 100)).toBe(40)
  })
  it('interpolates linearly between ranks', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBeCloseTo(25, 5)
    expect(percentile([0, 1, 2, 3, 4], 50)).toBeCloseTo(2, 5)
  })
  it('reads p2 / p98 a little inside the extremes', () => {
    const arr = Array.from({ length: 101 }, (_, i) => i) // 0..100
    expect(percentile(arr, 2)).toBeCloseTo(2, 5)
    expect(percentile(arr, 98)).toBeCloseTo(98, 5)
  })
})

// Five January days + five July days, hand-computable percentiles.
const archive = {
  daily: {
    time: [
      '2015-01-01', '2015-01-02', '2015-01-03', '2015-01-04', '2015-01-05',
      '2015-07-01', '2015-07-02', '2015-07-03', '2015-07-04', '2015-07-05',
    ],
    temperature_2m_max: [12, 13, 14, 15, 16, 28, 29, 30, 31, 32],
    temperature_2m_min: [2, 3, 4, 5, 6, 16, 17, 18, 19, 20],
  },
}

describe('fetchClimateRange', () => {
  it('derives annual p2/p98 across all days', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(archive) }))
    const { annual } = await fetchClimateRange(34.42, -119.7)
    expect(annual.coldC).toBeCloseTo(2.18, 1) // p2 of mins [2..6,16..20]
    expect(annual.hotC).toBeCloseTo(31.82, 1) // p98 of maxes [12..16,28..32]
  })

  it('buckets ranges by calendar month', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(archive) }))
    const { monthly } = await fetchClimateRange(34.42, -119.7)
    expect(monthly).toHaveLength(12)
    expect(monthly[0].coldC).toBeCloseTo(2.08, 1) // January mins [2..6]
    expect(monthly[0].hotC).toBeCloseTo(15.92, 1) // January maxes [12..16]
    expect(monthly[6].coldC).toBeCloseTo(16.08, 1) // July mins [16..20]
    expect(monthly[6].hotC).toBeCloseTo(31.92, 1) // July maxes [28..32]
  })

  it('falls back to the annual range for months with no data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(archive) }))
    const { annual, monthly } = await fetchClimateRange(34.42, -119.7)
    expect(monthly[3]).toEqual(annual) // April: no days in the sample
  })

  it('hits the Open-Meteo archive endpoint with the location', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(archive) })
    vi.stubGlobal('fetch', spy)
    await fetchClimateRange(34.42, -119.7)
    const url = spy.mock.calls[0][0] as string
    expect(url).toContain('archive-api.open-meteo.com')
    expect(url).toContain('latitude=34.42')
    expect(url).toContain('temperature_2m_max')
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchClimateRange(0, 0)).rejects.toThrow(/climate/i)
  })
})
