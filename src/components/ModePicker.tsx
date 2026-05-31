import { useEffect, useRef, useState } from 'react'
import type { ViewMode } from '../engine/types'
import { useMode } from '../ModeContext'

const MODES: { value: ViewMode; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'playground', label: 'Playground' },
]

export const ModePicker = () => {
  const { mode, setMode } = useMode()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = MODES.find((m) => m.value === mode)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1 text-xs text-white/85 hover:text-white"
      >
        <span className="text-white/45">Mode</span>
        <span>{active?.label}</span>
        <span className="text-white/45">⌄</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-36 overflow-hidden rounded-xl border border-white/15 bg-[#1a1a1a] py-1 shadow-lg"
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="menuitemradio"
              aria-checked={mode === m.value}
              onClick={() => {
                setMode(m.value)
                setOpen(false)
              }}
              className={`block w-full px-3 py-1.5 text-left text-xs ${
                mode === m.value ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
