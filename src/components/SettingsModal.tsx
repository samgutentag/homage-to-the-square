import { useEffect } from 'react'
import { useSettings } from '../SettingsContext'
import { CitySearch } from './CitySearch'
import type { ResolvedPlace, ScalingMode } from '../engine/types'

interface Option<T> { label: string; value: T }

function Segmented<T>({ label, options, value, onChange }: {
  label: string
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-white/60">{label}</span>
      <div className="flex gap-1 rounded-full bg-white/5 p-1">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`rounded-full px-3 py-1 text-xs leading-none transition-colors ${
                active ? 'bg-white/90 text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SCALING_OPTIONS: Option<ScalingMode>[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Annual', value: 'annual' },
]

interface SettingsModalProps {
  onClose: () => void
  onLearnMode: () => void
  onSelectPlace: (place: ResolvedPlace) => void
}

export const SettingsModal = ({ onClose, onLearnMode, onSelectPlace }: SettingsModalProps) => {
  const { fahrenheit, imperial, lightBg, scalingMode, setFahrenheit, setImperial, setLightBg, setScalingMode } = useSettings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      data-testid="settings-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        data-testid="settings-panel"
        onClick={(e) => e.stopPropagation()}
        className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-neutral-900/90 p-5 text-white shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide text-white/90">Settings</h2>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="rounded-full px-2 text-lg leading-none text-white/50 hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="mb-4">
          <span className="mb-1.5 block text-sm text-white/60">Location</span>
          <CitySearch onSelect={onSelectPlace} />
        </div>
        <div className="flex flex-col gap-3">
          <Segmented
            label="Temp"
            options={[{ label: '°F', value: true }, { label: '°C', value: false }]}
            value={fahrenheit}
            onChange={setFahrenheit}
          />
          <Segmented
            label="Units"
            options={[{ label: 'Imperial', value: true }, { label: 'Metric', value: false }]}
            value={imperial}
            onChange={setImperial}
          />
          <Segmented
            label="Backdrop"
            options={[{ label: 'Dark', value: false }, { label: 'Light', value: true }]}
            value={lightBg}
            onChange={setLightBg}
          />
          <Segmented
            label="Color by"
            options={SCALING_OPTIONS}
            value={scalingMode}
            onChange={setScalingMode}
          />
        </div>
        <p className="mt-4 text-[11px] leading-snug text-white/40">
          “Color by” stretches the temperature→hue scale across the day’s, month’s, or year’s
          local range. Wider color in mild climates.
        </p>
        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={onLearnMode}
            className="flex w-full items-center justify-between text-xs text-white/70 hover:text-white"
          >
            <span>Learn mode</span>
            <span className="text-white/40">how the painting reads the weather →</span>
          </button>
        </div>
      </div>
    </div>
  )
}
