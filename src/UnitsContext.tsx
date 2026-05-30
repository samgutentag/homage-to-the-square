import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'

interface UnitsCtx {
  fahrenheit: boolean
  imperial: boolean
  setFahrenheit: Dispatch<SetStateAction<boolean>>
  setImperial: Dispatch<SetStateAction<boolean>>
}

const Ctx = createContext<UnitsCtx | null>(null)

/** Shared unit preferences. Defaults to Fahrenheit + Imperial. */
export const UnitsProvider = ({ children }: { children: ReactNode }) => {
  const [fahrenheit, setFahrenheit] = useState(true)
  const [imperial, setImperial] = useState(true)
  return <Ctx.Provider value={{ fahrenheit, imperial, setFahrenheit, setImperial }}>{children}</Ctx.Provider>
}

export const useUnits = (): UnitsCtx => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUnits must be used within UnitsProvider')
  return ctx
}

/** Format a Celsius value in the chosen unit, e.g. "68°F" or "20°C". */
export const formatTemp = (celsius: number, fahrenheit: boolean): string =>
  `${Math.round(fahrenheit ? celsius * 9 / 5 + 32 : celsius)}°${fahrenheit ? 'F' : 'C'}`

/** Compact degree only, no unit suffix (for high/low pairs). */
export const formatDegree = (celsius: number, fahrenheit: boolean): string =>
  `${Math.round(fahrenheit ? celsius * 9 / 5 + 32 : celsius)}°`
