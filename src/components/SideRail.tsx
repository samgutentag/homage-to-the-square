import { CitySearch } from './CitySearch'
import type { ResolvedPlace } from '../engine/types'

interface SideRailProps {
  placeName: string
  tempText: string
  conditionText: string
  forecastText: string
  hour: string
  title: string
  stale: boolean
  onSelectCity: (place: ResolvedPlace) => void
}

const Label = ({ children }: { children: string }) => (
  <div className="text-[0.6rem] uppercase tracking-widest text-white/40">{children}</div>
)

export const SideRail = ({ placeName, tempText, conditionText, forecastText, hour, title, stale, onSelectCity }: SideRailProps) => (
  <aside className="flex w-full shrink-0 flex-col gap-4 bg-[#111] p-6 pr-20 text-sm text-white/85 md:h-full md:w-64 md:pr-6">
    <div>
      <Label>Location</Label>
      <div className="mb-2 text-base font-medium text-white">{placeName}</div>
      <CitySearch onSelect={onSelectCity} />
    </div>
    <div>
      <Label>Weather</Label>
      <div>
        {tempText} · {conditionText}
        {stale && <span className="ml-2 text-xs text-white/40">(stale)</span>}
      </div>
      {forecastText && <div className="mt-0.5 text-xs text-white/50">{forecastText}</div>}
    </div>
    <div><Label>Hour</Label><div>{hour}</div></div>
    <div className="mt-auto hidden md:block"><Label>Now showing</Label><div className="italic text-white/70">{title}</div></div>
  </aside>
)
