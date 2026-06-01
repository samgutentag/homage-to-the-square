import { useState, type ReactNode } from 'react'
import { ModeProvider, useMode } from './ModeContext'
import { SettingsProvider, useSettings, formatTemp, formatDegree } from './SettingsContext'
import { useClock } from './hooks/useClock'
import { usePlace } from './hooks/usePlace'
import { useWeather } from './hooks/useWeather'
import { useSky } from './hooks/useSky'
import { useClimateRange } from './hooks/useClimateRange'
import { useReveal } from './hooks/useReveal'
import { deriveEnvironment } from './engine/environment'
import { buildPalette } from './engine/palette'
import { buildComposition } from './engine/composition'
import { generateTitle } from './engine/title'
import { weatherCodeText } from './weatherText'
import { Painting } from './components/Painting'
import { ModePicker } from './components/ModePicker'
import { CitySearch } from './components/CitySearch'
import { PaintingTitle } from './components/HomageTitle'
import { Explore } from './components/Explore'
import { SettingsModal } from './components/SettingsModal'
import type { Environment, TempRange } from './engine/types'

// Quiet near-neutral gray. Only shown on the rare failure path (weather never loads);
// the normal path gates the reveal on real data, so this no longer flashes on startup.
const NEUTRAL: Environment = { hueDeg: 250, chroma: 0.02, lightness: 0.4, warmShift: 0, fogContrast: 1, moonLift: 0 }

// The "wall" the painting hangs on. Not pure black/white — a near-black and a soft gallery off-white.
const DARK_BG = '#0d0d0d'
const LIGHT_BG = '#f1efe8'

const GearButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open settings"
    title="Settings"
    className="rounded-full border border-white/40 px-2.5 py-1 text-xs leading-none text-white/85 hover:text-white"
  >
    ⚙
  </button>
)

const TopBar = ({ children }: { children: ReactNode }) => (
  <div className="fixed inset-x-2 top-2 z-50 flex justify-center sm:inset-x-0 sm:top-3">
    <div className="flex w-full max-w-[calc(100vw-1rem)] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-2xl border border-white/15 bg-black/55 px-4 py-2 text-sm text-white/85 shadow-lg backdrop-blur-md sm:w-auto sm:rounded-full">
      {children}
    </div>
  </div>
)

const Divider = () => <span className="hidden h-5 w-px bg-white/15 sm:block" />

const Title = ({ children, light }: { children: string; light: boolean }) => (
  <div className={`fixed bottom-6 left-6 z-40 max-w-[80vw] text-sm italic ${light ? 'text-black/70' : 'text-white/80'}`}>
    <PaintingTitle title={children} />
  </div>
)

const Stage = () => {
  const { mode } = useMode()
  const { fahrenheit, lightBg, scalingMode } = useSettings()
  const [chromeVisible, setChromeVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const bg = lightBg ? LIGHT_BG : DARK_BG
  const now = useClock(60000)
  const { place, selectPlace } = usePlace()
  const lat = place.lat
  const lon = place.lon
  const { weather, stale } = useWeather(lat, lon)
  const sky = useSky(now, lat, lon)
  const climate = useClimateRange(lat, lon)
  const revealed = useReveal(Boolean(weather && sky))

  // The temperature→hue scale stretches across the window the user picked. Undefined
  // (no data yet, or fetch failed) → deriveEnvironment falls back to the global range.
  const activeRange: TempRange | undefined =
    scalingMode === 'daily'
      ? (weather ? { coldC: weather.lowC, hotC: weather.highC } : undefined)
      : scalingMode === 'monthly'
        ? climate?.monthly[now.getMonth()]
        : climate?.annual

  const env = weather && sky ? deriveEnvironment(weather, sky, activeRange) : NEUTRAL
  const palette = buildPalette(env)
  const composition = buildComposition(weather?.relativeHumidity ?? 50, sky?.sunElevationDeg ?? 30)
  const title = generateTitle(env, now)
  const hour = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const placeName = place.name
  const conditionText = weather ? weatherCodeText(weather.weatherCode) : 'locating…'
  const tempText = weather ? formatTemp(weather.temperatureC, fahrenheit) : '—'
  const forecastShort = weather
    ? `↑${formatDegree(weather.highC, fahrenheit)} ↓${formatDegree(weather.lowC, fahrenheit)}`
    : ''

  // Full-bleed wall, with the painting capped at 80% of the smaller axis so there's matting
  // around it. The painting fades up from the wall on first load (opacity 0 → 1).
  const canvas = (
    <div className="flex h-full w-full items-center justify-center" style={{ background: bg }}>
      <div
        className="flex h-4/5 w-4/5 items-center justify-center"
        style={{ containerType: 'size', opacity: revealed ? 1 : 0, transition: 'opacity 1200ms ease' }}
      >
        <Painting composition={composition} palette={palette} />
      </div>
    </div>
  )

  const gear = <GearButton onClick={() => setSettingsOpen(true)} />
  const modal = settingsOpen ? <SettingsModal onClose={() => setSettingsOpen(false)} /> : null

  if (mode === 'about') {
    return (
      <>
        <div className="min-h-screen w-full overflow-x-hidden overflow-y-auto pt-20 text-white">
          <Explore />
        </div>
        <TopBar><ModePicker />{gear}</TopBar>
        {modal}
      </>
    )
  }

  // Live: fullscreen painting. Click the painting to hide the chrome (go immersive),
  // click again to bring it back. Clicks on the chrome itself don't toggle.
  return (
    <div className="h-screen w-screen" onClick={() => setChromeVisible((v) => !v)}>
      {canvas}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`transition-opacity duration-500 ${chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <TopBar>
          <div className="w-44 max-w-[60vw]">
            <CitySearch onSelect={selectPlace} />
          </div>
          <Divider />
          <div className="flex flex-col items-center justify-center leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-white">{placeName}</span>
              <span className="text-white/30">|</span>
              <span>{hour}</span>
              {stale && <span className="text-white/40">(stale)</span>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-2 text-white/70">
              <span className="whitespace-nowrap">{tempText} {conditionText}</span>
              {forecastShort && <span className="whitespace-nowrap text-white/50">{forecastShort}</span>}
            </div>
          </div>
          <Divider />
          <ModePicker />
          {gear}
        </TopBar>
        <Title light={lightBg}>{title}</Title>
      </div>
      {modal}
    </div>
  )
}

const App = () => {
  const params = new URLSearchParams(window.location.search)
  const initial = params.get('mode') === 'about' ? 'about' : undefined
  return (
    <SettingsProvider>
      <ModeProvider initialMode={initial}>
        <Stage />
      </ModeProvider>
    </SettingsProvider>
  )
}

export default App
