interface TimelineProps { gradient: string; progress: number; name: string; label: string }

export const Timeline = ({ gradient, progress, name, label }: TimelineProps) => (
  <div className="w-[380px]" data-timeline>
    <div className="relative h-3.5">
      <div className="absolute inset-0 rounded-full" style={{ background: gradient, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }} />
      <div
        className="absolute -top-1 -bottom-1 w-0.5 -ml-px rounded-full bg-white"
        style={{ left: `${(progress * 100).toFixed(2)}%`, boxShadow: '0 0 7px rgba(255,255,255,.85)' }}
      />
    </div>
    <div className="mt-1.5 flex justify-between text-[0.64rem] tracking-wide text-white/65">
      <span>{name}</span><span>{label}</span>
    </div>
  </div>
)
