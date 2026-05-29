import type { ViewMode } from '../engine/types'
import { useMode } from '../ModeContext'

const MODES: { value: ViewMode; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'explore', label: 'Explore' },
]

export const ModePicker = () => {
  const { mode, setMode } = useMode()
  return (
    <div className="flex gap-1 text-xs">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          className={`rounded-full border px-2 py-1 transition-colors ${
            mode === m.value
              ? 'border-transparent bg-white/90 text-black'
              : 'border-white/40 text-white/80 hover:text-white'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
