import type { Environment, Scenario, ScenarioSignals } from './types'
import {
  tempToHue, skyToChroma, lightnessFor, sunToWarmShift,
  visibilityToFogContrast, isNight, moonToLift,
} from './mappers'
import { buildPalette } from './palette'
import { oklchCss } from './color'

export const hourToElev = (hour: number): number => 60 * Math.sin((2 * Math.PI * (hour - 6)) / 24)

/** Sway the sun a few hours around a base hour over the loop so the square centers
 *  always rise and fall, even in scenes built around a different signal. Seamless:
 *  the offset is 0 at p=0 and p=1. */
const drift = (baseHour: number, p: number): number => baseHour + 3 * Math.sin(2 * Math.PI * p)

export const envFromSignals = (s: ScenarioSignals): Environment => {
  const elev = hourToElev(s.hour)
  return {
    hueDeg: tempToHue(s.tempC),
    chroma: skyToChroma(s.cloud, s.precipMm),
    lightness: lightnessFor(s.cloud, s.precipMm, elev),
    warmShift: sunToWarmShift(elev),
    fogContrast: visibilityToFogContrast(s.visM),
    moonLift: moonToLift(s.moon, isNight(elev)),
  }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'clearDay', name: 'Clear Day Arc', durationMs: 14000,
    at: (p) => ({ hour: (p * 24) % 24, tempC: 18, cloud: 8, precipMm: 0, visM: 20000, moon: 0.3, humidity: 30 }),
  },
  {
    id: 'thunderstorm', name: 'Afternoon Thunderstorm', durationMs: 13000,
    at: (p) => { const k = Math.sin(Math.PI * p); return { hour: drift(14, p), tempC: 22 - k * 6, cloud: 10 + k * 88, precipMm: k * 8, visM: 20000 - k * 18500, moon: 0, humidity: 60 } },
  },
  {
    id: 'fullMoon', name: 'Full Moon Night', durationMs: 12000,
    at: (p) => ({ hour: drift(1, p), tempC: 11, cloud: 12, precipMm: 0, visM: 20000, moon: 0.5 - 0.5 * Math.cos(2 * Math.PI * p), humidity: 35 }),
  },
  {
    id: 'rollingFog', name: 'Rolling Fog', durationMs: 12000,
    at: (p) => { const k = Math.sin(Math.PI * p); return { hour: drift(10, p), tempC: 13, cloud: 45, precipMm: 0, visM: 20000 - k * 19500, moon: 0, humidity: 40 } },
  },
  {
    id: 'heatWave', name: 'Heat Wave', durationMs: 12000,
    at: (p) => { const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * p); return { hour: drift(13, p), tempC: 28 + k * 12, cloud: 5, precipMm: 0, visM: 20000, moon: 0, humidity: 25 } },
  },
  {
    id: 'humidDrift', name: 'Humid Drift (3↔4)', durationMs: 9000,
    at: (p) => ({ hour: drift(13, p), tempC: 20, cloud: 15, precipMm: 0, visM: 20000, moon: 0, humidity: (Math.sin(2 * Math.PI * p - Math.PI / 2) * 0.5 + 0.5) * 100 }),
  },
]

export const timelineGradient = (scenario: Scenario): string => {
  const N = 24
  const stops: string[] = []
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1)
    const pal = buildPalette(envFromSignals(scenario.at(p)))
    stops.push(`${oklchCss(pal[2])} ${(p * 100).toFixed(1)}%`)
  }
  return `linear-gradient(90deg,${stops.join(',')})`
}
