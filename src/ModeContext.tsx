import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ViewMode } from './engine/types'

interface ModeCtx { mode: ViewMode; setMode: (m: ViewMode) => void }
const Ctx = createContext<ModeCtx | null>(null)

export const ModeProvider = ({ children, initialMode }: { children: ReactNode; initialMode?: ViewMode }) => {
  const [mode, setMode] = useState<ViewMode>(initialMode ?? 'live')
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>
}

export const useMode = (): ModeCtx => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
