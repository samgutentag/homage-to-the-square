import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchCities } from './location'

afterEach(() => vi.restoreAllMocks())

describe('searchCities', () => {
  it('maps results to places, disambiguated by region + country', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [
        { latitude: 45.52, longitude: -122.68, name: 'Portland', admin1: 'Oregon', country: 'United States' },
        { latitude: 43.66, longitude: -70.26, name: 'Portland', admin1: 'Maine', country: 'United States' },
      ] }),
    }))
    expect(await searchCities('Portland')).toEqual([
      { lat: 45.52, lon: -122.68, name: 'Portland, Oregon, United States' },
      { lat: 43.66, lon: -70.26, name: 'Portland, Maine, United States' },
    ])
  })
  it('returns an empty list when there are no matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
    expect(await searchCities('zzzz')).toEqual([])
  })
  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(searchCities('Berlin')).rejects.toThrow(/search/i)
  })
})
