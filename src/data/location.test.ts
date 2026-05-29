import { describe, it, expect, vi, afterEach } from 'vitest'
import { geocodeCity, ipLocate } from './location'

afterEach(() => vi.restoreAllMocks())

describe('geocodeCity', () => {
  it('resolves the first match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ latitude: 52.52, longitude: 13.41, name: 'Berlin', country: 'Germany' }] }),
    }))
    expect(await geocodeCity('Berlin')).toEqual({ lat: 52.52, lon: 13.41, name: 'Berlin, Germany' })
  })
  it('throws when there are no matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
    await expect(geocodeCity('zzzz')).rejects.toThrow(/no match/i)
  })
})

describe('ipLocate', () => {
  it('maps an IP response into a place', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latitude: 37.8, longitude: -122.27, city: 'Oakland', region: 'California' }),
    }))
    expect(await ipLocate()).toEqual({ lat: 37.8, lon: -122.27, name: 'Oakland, California' })
  })
})
