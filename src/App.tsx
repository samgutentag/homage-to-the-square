import { ModeProvider, useMode } from './ModeContext'
import { UnitsProvider, useUnits, formatTemp, formatDegree } from './UnitsContext'
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

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const Stage = () => {
  const { mode } = useMode()
  const { fahrenheit } = useUnits()
  const now = useClock(60000)
  const { place, error, selectPlace } = useGeolocation()
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
  const tempText = weather ? formatTemp(weather.temperatureC, fahrenheit) : '—'
  const forecastText = weather
    ? `${capitalize(weatherCodeText(weather.dailyCode))} · High ${formatDegree(weather.highC, fahrenheit)}, Low ${formatDegree(weather.lowC, fahrenheit)}`
    : ''

  // The mode picker lives in one fixed spot across every view so it never jumps.
  const picker = (
    <div className="fixed right-4 top-4 z-50">
      <ModePicker />
    </div>
  )

  if (mode === 'explore') {
    return (
      <>
        <div className="min-h-screen w-screen overflow-auto pt-16 text-white">
          <Explore />
        </div>
        {picker}
      </>
    )
  }

  if (mode === 'ambient') {
    return (
      <>
        <div className="h-screen w-screen">
          <div className="flex h-full w-full items-center justify-center bg-[#0d0d0d]">
            <Painting composition={composition} palette={palette} />
          </div>
          <Overlay>
            <div className="fixed bottom-6 left-6 text-sm italic text-white/80">{title}</div>
          </Overlay>
        </div>
        {picker}
      </>
    )
  }

  return (
    <>
      <div className="flex h-screen w-screen flex-col overflow-auto md:flex-row md:overflow-hidden">
        <SideRail
          placeName={place?.name ?? error ?? 'Locating…'}
          tempText={tempText}
          conditionText={conditionText}
          forecastText={forecastText}
          hour={hour}
          title={title}
          stale={stale}
          onSelectCity={selectPlace}
        />
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0d0d0d] p-3">
          <Painting composition={composition} palette={palette} />
        </div>
      </div>
      {picker}
    </>
  )
}

const App = () => {
  const params = new URLSearchParams(window.location.search)
  const initial = params.get('mode') === 'explore' ? 'explore' : undefined
  return (
    <UnitsProvider>
      <ModeProvider initialMode={initial}>
        <Stage />
      </ModeProvider>
    </UnitsProvider>
  )
}

export default App
