import type { Weather } from '../engine/types'

const CURRENT_FIELDS =
  'temperature_2m,weather_code,cloud_cover,precipitation,visibility,relative_humidity_2m,is_day'

export const fetchWeather = async (lat: number, lon: number): Promise<Weather> => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${CURRENT_FIELDS}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`weather fetch failed: ${res.status}`)
  const c = (await res.json()).current
  return {
    temperatureC: c.temperature_2m,
    weatherCode: c.weather_code,
    cloudCover: c.cloud_cover,
    precipitation: c.precipitation,
    visibilityM: c.visibility,
    relativeHumidity: c.relative_humidity_2m,
    isDay: c.is_day === 1,
  }
}
