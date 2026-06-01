import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { ScalingMode } from './engine/types'

interface SettingsCtx {
  fahrenheit: boolean
  imperial: boolean
  lightBg: boolean
  scalingMode: ScalingMode
  setFahrenheit: Dispatch<SetStateAction<boolean>>
  setImperial: Dispatch<SetStateAction<boolean>>
  setLightBg: Dispatch<SetStateAction<boolean>>
  setScalingMode: Dispatch<SetStateAction<ScalingMode>>
}

interface PersistedSettings {
  fahrenheit: boolean
  imperial: boolean
  lightBg: boolean
  scalingMode: ScalingMode
}

const DEFAULTS: PersistedSettings = {
  fahrenheit: true,
  imperial: true,
  lightBg: false,
  scalingMode: 'annual',
}

const STORAGE_KEY = 'settings:v1'

const load = (): PersistedSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PersistedSettings>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

const Ctx = createContext<SettingsCtx | null>(null)

/** Shared user preferences: units, backdrop, and temperature scaling. Persisted to localStorage. */
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const initial = load()
  const [fahrenheit, setFahrenheit] = useState(initial.fahrenheit)
  const [imperial, setImperial] = useState(initial.imperial)
  const [lightBg, setLightBg] = useState(initial.lightBg)
  const [scalingMode, setScalingMode] = useState<ScalingMode>(initial.scalingMode)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fahrenheit, imperial, lightBg, scalingMode }))
    } catch {
      // Private mode / quota — persistence is best-effort.
    }
  }, [fahrenheit, imperial, lightBg, scalingMode])

  return (
    <Ctx.Provider value={{ fahrenheit, imperial, lightBg, scalingMode, setFahrenheit, setImperial, setLightBg, setScalingMode }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSettings = (): SettingsCtx => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

/** Format a Celsius value in the chosen unit, e.g. "68°F" or "20°C". */
export const formatTemp = (celsius: number, fahrenheit: boolean): string =>
  `${Math.round(fahrenheit ? celsius * 9 / 5 + 32 : celsius)}°${fahrenheit ? 'F' : 'C'}`

/** Compact degree only, no unit suffix (for high/low pairs). */
export const formatDegree = (celsius: number, fahrenheit: boolean): string =>
  `${Math.round(fahrenheit ? celsius * 9 / 5 + 32 : celsius)}°`
