import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWeather } from './weather'

const sample = {
  current: {
    temperature_2m: 18.4, weather_code: 3, cloud_cover: 75, precipitation: 0.2,
    visibility: 14000, relative_humidity_2m: 66, is_day: 1,
  },
  daily: { temperature_2m_max: [22.1], temperature_2m_min: [11.5] },
}

afterEach(() => vi.restoreAllMocks())

describe('fetchWeather', () => {
  it('maps Open-Meteo current weather into Weather', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sample) }))
    expect(await fetchWeather(37.8, -122.27)).toEqual({
      temperatureC: 18.4, weatherCode: 3, cloudCover: 75, precipitation: 0.2,
      visibilityM: 14000, relativeHumidity: 66, isDay: true,
      highC: 22.1, lowC: 11.5,
    })
  })
  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchWeather(0, 0)).rejects.toThrow(/weather/i)
  })
})
