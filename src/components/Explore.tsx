import { useEffect, useMemo, useRef, useState } from 'react'
import { Painting } from './Painting'
import { Timeline } from './Timeline'
import { Methodology } from './Methodology'
import { buildPalette } from '../engine/palette'
import { buildComposition } from '../engine/composition'
import { deriveEnvironment } from '../engine/environment'
import { generateTitle } from '../engine/title'
import { SCENARIOS, hourToElev, timelineGradient } from '../engine/scenarios'
import { useUnits } from '../UnitsContext'
import type { Scenario, Weather, Sky } from '../engine/types'

interface Signals { hour: number; tempC: number; cloud: number; precipMm: number; visM: number; moon: number; humidity: number }
const INITIAL: Signals = { hour: 13, tempC: 20, cloud: 20, precipMm: 0, visM: 20000, moon: 0.5, humidity: 30 }

const fmtHour = (h: number) => {
  let hh = Math.floor(h) % 24
  let mm = Math.round((h - Math.floor(h)) * 60)
  if (mm === 60) { hh = (hh + 1) % 24; mm = 0 }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export const Explore = () => {
  const [s, setS] = useState<Signals>(INITIAL)
  const { fahrenheit, imperial, setFahrenheit, setImperial } = useUnits()
  const [active, setActive] = useState<Scenario | null>(null)
  const [progress, setProgress] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    const step = (ts: number) => {
      if (start.current === null) start.current = ts
      const p = ((ts - start.current) % active.durationMs) / active.durationMs
      setProgress(p)
      setS(active.at(p))
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current); start.current = null }
  }, [active])

  const set = (patch: Partial<Signals>) => { start.current = null; setActive(null); setS((prev) => ({ ...prev, ...patch })) }

  const gradient = useMemo(() => (active ? timelineGradient(active) : ''), [active])

  const elev = hourToElev(s.hour)
  const weather: Weather = {
    temperatureC: s.tempC, weatherCode: 0, cloudCover: s.cloud, precipitation: s.precipMm,
    visibilityM: s.visM, relativeHumidity: s.humidity, isDay: elev > 0,
    highC: s.tempC, lowC: s.tempC, dailyCode: 0,
  }
  const sky: Sky = { sunElevationDeg: elev, moonIllumination: s.moon }
  const env = deriveEnvironment(weather, sky)
  const palette = buildPalette(env)
  const composition = buildComposition(s.humidity, elev)
  const title = generateTitle(env, new Date(2026, 0, 1, Math.floor(s.hour)))

  const tempDisplay = fahrenheit ? Math.round(s.tempC * 9 / 5 + 32) : Math.round(s.tempC)
  const visDisplay = imperial ? (s.visM / 1609.34).toFixed(1) + ' mi' : (s.visM / 1000).toFixed(1) + ' km'
  const precipDisplay = imperial ? (s.precipMm / 25.4).toFixed(2) + ' in' : s.precipMm.toFixed(1) + ' mm'

  return (
    <>
    <div className="flex flex-wrap items-start gap-6 p-4 md:gap-8 md:p-8">
      <div>
        <div className="flex aspect-square w-[min(95vw,380px)] items-center justify-center rounded-md bg-[#0d0d0d] p-2" style={{ containerType: 'size' }}>
          <Painting composition={composition} palette={palette} />
        </div>
        <div className="mt-4 w-[min(95vw,380px)] text-center italic text-white/85">{title}</div>
        {active && (
          <div className="mt-4 flex justify-center">
            <Timeline gradient={gradient} progress={progress} name={active.name} label={active.id === 'clearDay' ? fmtHour(s.hour) : `${Math.round(progress * 100)}%`} />
          </div>
        )}
        <div className="mt-5 grid w-[min(95vw,380px)] grid-cols-2 gap-2">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => { start.current = null; setActive(active?.id === sc.id ? null : sc) }}
              className={`rounded-lg border p-2 text-left text-xs ${active?.id === sc.id ? 'border-transparent bg-amber-500 text-black' : 'border-white/20 bg-white/5 text-white/85 hover:border-amber-500'}`}
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full text-white/85 md:min-w-[340px] md:flex-1">
        <div className="mb-5 flex gap-2">
          <button onClick={() => setFahrenheit((v) => !v)} className="rounded-full border border-white/30 px-3 py-1 text-xs">Temperature: {fahrenheit ? '°F' : '°C'}</button>
          <button onClick={() => setImperial((v) => !v)} className="rounded-full border border-white/30 px-3 py-1 text-xs">Units: {imperial ? 'Imperial' : 'Metric'}</button>
        </div>
        <Slider label="Time of day" hint="Sun height moves the squares: they rise toward center at midday, sink toward the bottom at night." value={fmtHour(s.hour) + ' · ' + Math.round(elev) + '°'} min={0} max={24} step={0.25} v={s.hour} onChange={(hour) => set({ hour })} />
        <Slider label="Temperature" hint="Sets the base hue — cold leans cool blue, hot leans warm ochre." value={tempDisplay + (fahrenheit ? '°F' : '°C')} min={-18} max={43} step={0.5} v={s.tempC} onChange={(tempC) => set({ tempC })} />
        <Slider label="Cloud cover" hint="More cloud drains the color and dims the daytime brightness." value={s.cloud + '%'} min={0} max={100} step={1} v={s.cloud} onChange={(cloud) => set({ cloud })} />
        <Slider label="Precipitation" hint="Rain deepens the gray and darkens the whole painting." value={precipDisplay} min={0} max={10} step={0.1} v={s.precipMm} onChange={(precipMm) => set({ precipMm })} />
        <Slider label="Visibility / fog" hint="Fog compresses the contrast between squares until they nearly merge." value={visDisplay} min={50} max={20000} step={50} v={s.visM} onChange={(visM) => set({ visM })} />
        <Slider label="Moon illumination" hint="At night only, a brighter moon lifts the value of the innermost square." value={Math.round(s.moon * 100) + '%'} min={0} max={1} step={0.01} v={s.moon} onChange={(moon) => set({ moon })} />
        <Slider label="Humidity → squares (3↔4)" hint="Higher humidity morphs the composition from four squares down to three." value={s.humidity + '%'} min={0} max={100} step={1} v={s.humidity} onChange={(humidity) => set({ humidity })} />
      </div>
    </div>
    <Methodology env={env} hour={s.hour} />
    </>
  )
}

interface SliderProps { label: string; value: string; hint: string; min: number; max: number; step: number; v: number; onChange: (n: number) => void }
const Slider = ({ label, value, hint, min, max, step, v, onChange }: SliderProps) => (
  <div className="mb-4">
    <label className="mb-1 flex justify-between text-xs">
      <span>{label}</span><span className="tabular-nums opacity-70">{value}</span>
    </label>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-amber-500" />
    <p className="mt-1 text-[0.68rem] leading-snug text-white/40">{hint}</p>
  </div>
)
