import type { ClimateRanges, TempRange } from '../engine/types'

// Fixed 10-year window: deterministic, cache-friendly, and avoids any date math.
const START = '2015-01-01'
const END = '2024-12-31'

/** Linear-interpolated percentile of an ascending-sorted array. p in [0, 100]. */
export const percentile = (sortedAsc: number[], p: number): number => {
  if (sortedAsc.length === 0) return NaN
  if (sortedAsc.length === 1) return sortedAsc[0]
  const rank = (p / 100) * (sortedAsc.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  const frac = rank - lo
  return sortedAsc[lo] + frac * (sortedAsc[hi] - sortedAsc[lo])
}

const rangeFrom = (mins: number[], maxes: number[]): TempRange => ({
  coldC: percentile([...mins].sort((a, b) => a - b), 2),
  hotC: percentile([...maxes].sort((a, b) => a - b), 98),
})

export const fetchClimateRange = async (lat: number, lon: number): Promise<ClimateRanges> => {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${START}&end_date=${END}` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`climate fetch failed: ${res.status}`)
  const json = await res.json()
  const d = json?.daily
  const times: string[] = d?.time ?? []
  const maxes: number[] = d?.temperature_2m_max ?? []
  const mins: number[] = d?.temperature_2m_min ?? []
  if (times.length === 0 || maxes.length !== times.length || mins.length !== times.length) {
    throw new Error('climate fetch returned malformed payload')
  }

  const annual = rangeFrom(mins, maxes)

  const minsByMonth: number[][] = Array.from({ length: 12 }, () => [])
  const maxesByMonth: number[][] = Array.from({ length: 12 }, () => [])
  for (let i = 0; i < times.length; i++) {
    const month = Number(times[i].slice(5, 7)) - 1 // 'YYYY-MM-DD' → 0-based month
    minsByMonth[month].push(mins[i])
    maxesByMonth[month].push(maxes[i])
  }
  const monthly: TempRange[] = minsByMonth.map((monthMins, m) =>
    monthMins.length === 0 ? annual : rangeFrom(monthMins, maxesByMonth[m]),
  )

  return { annual, monthly }
}
