import type { ReactNode } from 'react'
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
import { Overlay } from './components/Overlay'
import { ModePicker } from './components/ModePicker'
import { CitySearch } from './components/CitySearch'
import { Explore } from './components/Explore'
import type { Environment } from './engine/types'

const NEUTRAL: Environment = { hueDeg: 220, chroma: 0.25, lightness: 0.4, warmShift: 0, fogContrast: 1, moonLift: 0 }

const TopBar = ({ children }: { children: ReactNode }) => (
  <div className="fixed inset-x-2 top-2 z-50 flex justify-center sm:inset-x-0 sm:top-3">
    <div className="flex w-full max-w-[calc(100vw-1rem)] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-2xl border border-white/15 bg-black/55 px-4 py-2 text-sm text-white/85 shadow-lg backdrop-blur-md sm:w-auto sm:rounded-full">
      {children}
    </div>
  </div>
)

const Divider = () => <span className="hidden h-5 w-px bg-white/15 sm:block" />

const Title = ({ children }: { children: string }) => (
  <div className="fixed bottom-6 left-6 z-40 max-w-[80vw] text-sm italic text-white/80">{children}</div>
)

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
  const placeName = place?.name ?? error ?? 'Locating…'
  const conditionText = weather ? weatherCodeText(weather.weatherCode) : 'locating…'
  const tempText = weather ? formatTemp(weather.temperatureC, fahrenheit) : '—'
  const forecastShort = weather
    ? `↑${formatDegree(weather.highC, fahrenheit)} ↓${formatDegree(weather.lowC, fahrenheit)}`
    : ''

  const canvas = (
    <div className="flex h-full w-full items-center justify-center bg-[#0d0d0d]" style={{ containerType: 'size' }}>
      <Painting composition={composition} palette={palette} />
    </div>
  )

  if (mode === 'playground') {
    return (
      <>
        <div className="min-h-screen w-screen overflow-auto pt-20 text-white">
          <Explore />
        </div>
        <TopBar><ModePicker /></TopBar>
      </>
    )
  }

  if (mode === 'ambient') {
    return (
      <div className="h-screen w-screen">
        {canvas}
        <Overlay>
          <TopBar><ModePicker /></TopBar>
          <Title>{title}</Title>
        </Overlay>
      </div>
    )
  }

  // Live: fullscreen painting, everything in a top pill, title bottom-left.
  return (
    <>
      <div className="h-screen w-screen">{canvas}</div>
      <TopBar>
        <div className="w-44 max-w-[60vw]">
          <CitySearch onSelect={selectPlace} />
        </div>
        <Divider />
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5">
          <span className="font-medium text-white">{placeName}</span>
          <span className="whitespace-nowrap">{tempText} {conditionText}</span>
          {forecastShort && <span className="whitespace-nowrap text-white/55">{forecastShort}</span>}
          <span>{hour}</span>
          {stale && <span className="text-white/40">(stale)</span>}
        </div>
        <Divider />
        <ModePicker />
      </TopBar>
      <Title>{title}</Title>
    </>
  )
}

const App = () => {
  const params = new URLSearchParams(window.location.search)
  const initial = params.get('mode') === 'playground' ? 'playground' : undefined
  return (
    <UnitsProvider>
      <ModeProvider initialMode={initial}>
        <Stage />
      </ModeProvider>
    </UnitsProvider>
  )
}

export default App
