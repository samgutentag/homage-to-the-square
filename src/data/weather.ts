import type { Weather } from '../engine/types'

const CURRENT_FIELDS =
  'temperature_2m,weather_code,cloud_cover,precipitation,visibility,relative_humidity_2m,is_day'
const DAILY_FIELDS = 'temperature_2m_max,temperature_2m_min'

export const fetchWeather = async (lat: number, lon: number): Promise<Weather> => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=${CURRENT_FIELDS}&daily=${DAILY_FIELDS}&timezone=auto&forecast_days=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`weather fetch failed: ${res.status}`)
  const json = await res.json()
  const c = json.current
  const d = json.daily
  return {
    temperatureC: c.temperature_2m,
    weatherCode: c.weather_code,
    cloudCover: c.cloud_cover,
    precipitation: c.precipitation,
    visibilityM: c.visibility,
    relativeHumidity: c.relative_humidity_2m,
    isDay: c.is_day === 1,
    highC: d.temperature_2m_max[0],
    lowC: d.temperature_2m_min[0],
  }
}
