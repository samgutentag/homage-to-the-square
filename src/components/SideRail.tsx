import { ModePicker } from './ModePicker'

interface SideRailProps {
  placeName: string
  temperatureC: number
  conditionText: string
  hour: string
  title: string
  stale: boolean
}

const Label = ({ children }: { children: string }) => (
  <div className="text-[0.6rem] uppercase tracking-widest text-white/40">{children}</div>
)

export const SideRail = ({ placeName, temperatureC, conditionText, hour, title, stale }: SideRailProps) => (
  <aside className="flex w-full shrink-0 flex-col gap-4 bg-[#111] p-6 text-sm text-white/85 md:h-full md:w-64">
    <div><Label>Location</Label><div>{placeName}</div></div>
    <div>
      <Label>Weather</Label>
      <div>
        {Math.round(temperatureC)}°C · {conditionText}
        {stale && <span className="ml-2 text-white/40">(stale)</span>}
      </div>
    </div>
    <div><Label>Hour</Label><div>{hour}</div></div>
    <div className="mt-auto"><Label>Now showing</Label><div className="italic text-white/70">{title}</div></div>
    <ModePicker />
  </aside>
)
