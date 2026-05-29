import { useState } from 'react'
import { ModeProvider, useMode } from './ModeContext'
import { useClock } from './hooks/useClock'
import { useGeolocation } from './hooks/useGeolocation'
import { useWeather } from './hooks/useWeather'
import { useSky } from './hooks/useSky'
import { deriveEnvironment } from './engine/environment'
import { buildPalette } from './engine/palette'
import { buildComposition } from './engine/composition'
import { generateTitle } from './engine/title'
import { weatherCodeText } from './weatherText'
import { Painting } from './components/Painting'
import { SideRail } from './components/SideRail'
import { Overlay } from './components/Overlay'
import { ModePicker } from './components/ModePicker'
import { Explore } from './components/Explore'
import type { Environment } from './engine/types'

const NEUTRAL: Environment = { hueDeg: 220, chroma: 0.25, lightness: 0.4, warmShift: 0, fogContrast: 1, moonLift: 0 }

const Stage = () => {
  const { mode } = useMode()
  const now = useClock(60000)
  const { place, error, setCity } = useGeolocation()
  const lat = place?.lat ?? null
  const lon = place?.lon ?? null
  const { weather, stale } = useWeather(lat, lon)
  const sky = useSky(now, lat, lon)

  const env = weather && sky ? deriveEnvironment(weather, sky) : NEUTRAL
  const palette = buildPalette(env)
  const composition = buildComposition(weather?.relativeHumidity ?? 50, sky?.sunElevationDeg ?? 30)
  const title = generateTitle(env, now)
  const hour = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const conditionText = weather ? weatherCodeText(weather.weatherCode) : 'locating…'

  if (mode === 'explore') return <div className="min-h-screen w-screen overflow-auto text-white"><Explore /></div>

  if (mode === 'ambient') {
    return (
      <div className="h-screen w-screen">
        <div className="flex h-full w-full items-center justify-center bg-[#0d0d0d]">
          <Painting composition={composition} palette={palette} />
        </div>
        <Overlay>
          <div className="fixed right-6 top-6"><ModePicker /></div>
          <div className="fixed bottom-6 left-6 text-sm italic text-white/80">{title}</div>
        </Overlay>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen">
      <SideRail
        placeName={place?.name ?? error ?? 'Locating…'}
        temperatureC={weather?.temperatureC ?? 0}
        conditionText={conditionText}
        hour={hour}
        title={title}
        stale={stale}
      />
      <div className="flex flex-1 items-center justify-center bg-[#0d0d0d]">
        <Painting composition={composition} palette={palette} />
      </div>
      <CitySearch onSubmit={setCity} />
    </div>
  )
}

const CitySearch = ({ onSubmit }: { onSubmit: (name: string) => void }) => {
  const [value, setValue] = useState('')
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()) }}
      className="fixed bottom-4 right-4"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Set city…"
        className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40"
      />
    </form>
  )
}

const App = () => (
  <ModeProvider><Stage /></ModeProvider>
)

export default App
