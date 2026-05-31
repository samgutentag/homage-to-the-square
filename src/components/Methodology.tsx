import type { ReactNode } from 'react'
import { Painting } from './Painting'
import { buildPalette } from '../engine/palette'
import { buildComposition } from '../engine/composition'
import { envFromSignals, hourToElev } from '../engine/scenarios'
import { warmthWord, clarityWord, timeOfDayWord, generateTitle } from '../engine/title'
import { HomageLink, PaintingTitle } from './HomageTitle'
import type { Environment, ScenarioSignals } from '../engine/types'

const BASE: ScenarioSignals = { hour: 13, tempC: 18, cloud: 10, precipMm: 0, visM: 20000, moon: 0, humidity: 25 }

// A small static painting rendered straight from the engine for a given signal set.
const Mini = ({ patch, caption }: { patch: Partial<ScenarioSignals>; caption: string }) => {
  const s = { ...BASE, ...patch }
  const env = envFromSignals(s)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-20 w-20 rounded" style={{ containerType: 'size', background: '#0d0d0d' }}>
        <div className="flex h-full w-full items-center justify-center">
          <Painting composition={buildComposition(s.humidity, hourToElev(s.hour))} palette={buildPalette(env)} />
        </div>
      </div>
      <span className="text-[0.62rem] text-white/50">{caption}</span>
    </div>
  )
}

const Concept = ({ title, desc, children }: { title: string; desc: string; children: ReactNode }) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
    <div className="flex items-end justify-center gap-4">{children}</div>
    <h4 className="mt-3 text-sm font-medium text-white">{title}</h4>
    <p className="mt-0.5 text-xs leading-snug text-white/55">{desc}</p>
  </div>
)

const Band = ({ rows, active }: { rows: [string, string][]; active: string }) => (
  <ul className="space-y-1">
    {rows.map(([word, cond]) => {
      const on = word === active
      return (
        <li key={word} className={`flex items-baseline justify-between rounded px-2 py-1 text-xs ${on ? 'bg-amber-500/20 text-white' : 'text-white/50'}`}>
          <span className={on ? 'font-medium' : ''}>{word}</span>
          <span className="ml-3 text-[0.66rem] text-white/40">{cond}</span>
        </li>
      )
    })}
  </ul>
)

const WARMTH: [string, string][] = [
  ['Warm', 'hue < 110° · hot'],
  ['Temperate', '110–190° · mild'],
  ['Cool', '≥ 190° · cold'],
]
const CLARITY: [string, string][] = [
  ['Clarity', 'chroma > 0.6 · clear'],
  ['Haze', '0.3–0.6'],
  ['Overcast', '≤ 0.3'],
]
const TOD: [string, string][] = [
  ['Dawn', 'before 7'],
  ['Morning', '7–11'],
  ['Midday', '11–15'],
  ['Afternoon', '15–18'],
  ['Dusk', '18–21'],
  ['Night', 'after 21'],
]

interface MethodologyProps {
  env: Environment
  hour: number
}

export const Methodology = ({ env, hour }: MethodologyProps) => {
  const h = Math.floor(hour) % 24
  const title = generateTitle(env, new Date(2026, 0, 1, h))

  return (
    <section className="mx-auto max-w-4xl px-4 pb-16 pt-4 text-white/85 md:px-8">
      <h2 className="text-lg font-semibold text-white">Methodology</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
        Albers' <HomageLink className="italic underline decoration-dotted underline-offset-2 hover:decoration-solid">Homage to the Square</HomageLink> is a fixed geometry — flat nested squares pushed toward the
        bottom — so the painting is really a function: weather and the sun become a palette and a
        composition. Every square below is rendered by the same engine the live view uses. Color is computed
        in OKLCH so transitions stay perceptually even.
      </p>

      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-white/40">What each signal does</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Concept title="Temperature → hue" desc="Cold pulls the base hue cool; hot pushes it warm.">
          <Mini patch={{ tempC: -8 }} caption="−8°" />
          <Mini patch={{ tempC: 34 }} caption="34°" />
        </Concept>
        <Concept title="Sky → saturation + brightness" desc="Cloud and rain drain the color and dim the day.">
          <Mini patch={{ cloud: 0 }} caption="clear" />
          <Mini patch={{ cloud: 100, precipMm: 4 }} caption="overcast" />
        </Concept>
        <Concept title="Sun → position + day/night" desc="The sun's height lifts the squares at midday, sinks them and darkens the wall at night.">
          <Mini patch={{ hour: 13 }} caption="midday" />
          <Mini patch={{ hour: 1 }} caption="night" />
        </Concept>
        <Concept title="Fog → contrast" desc="Low visibility compresses the value steps until the squares nearly merge.">
          <Mini patch={{ visM: 20000 }} caption="clear air" />
          <Mini patch={{ visM: 300 }} caption="fog" />
        </Concept>
        <Concept title="Moon → night glow" desc="At night only, a fuller moon lifts the innermost square.">
          <Mini patch={{ hour: 1, moon: 0 }} caption="new" />
          <Mini patch={{ hour: 1, moon: 1 }} caption="full" />
        </Concept>
        <Concept title="Humidity → 3 ↔ 4 squares" desc="Higher humidity morphs the composition from four squares to three.">
          <Mini patch={{ humidity: 10 }} caption="4 squares" />
          <Mini patch={{ humidity: 90 }} caption="3 squares" />
        </Concept>
      </div>

      <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-white/40">How it gets named</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
        Each painting gets a title from three thresholds — warmth (from hue), clarity (from chroma), and the
        hour. The bands matching your current sliders are highlighted live:
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="mb-1 text-[0.66rem] uppercase tracking-widest text-white/40">Warmth · hue</div>
          <Band rows={WARMTH} active={warmthWord(env.hueDeg)} />
        </div>
        <div>
          <div className="mb-1 text-[0.66rem] uppercase tracking-widest text-white/40">Clarity · chroma</div>
          <Band rows={CLARITY} active={clarityWord(env.chroma)} />
        </div>
        <div>
          <div className="mb-1 text-[0.66rem] uppercase tracking-widest text-white/40">Time of day</div>
          <Band rows={TOD} active={timeOfDayWord(h)} />
        </div>
      </div>
      <p className="mt-4 text-center text-sm italic text-white/80"><PaintingTitle title={title} /></p>

      <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-white/40">Notes</h3>
      <ul className="mt-3 max-w-2xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/60">
        <li>The geometry blends between two <em>real</em> Albers templates (an authentic 4-square and 3-square, pushed down with the wide margin on top), so every in-between is a real Albers spacing — never invented.</li>
        <li>The sun's visible job is <strong>position</strong>, not brightness. Weather sets brightness; the sun only gates day vs night, which keeps the moon glow legible.</li>
        <li>Fog acting on the contrast <em>between</em> squares is the most Albers-true effect here — his whole subject was how adjacent colors change each other.</li>
        <li>Backgrounds avoid pure black and white (a near-black wall, a soft off-white) so the painting always owns the lightest and darkest notes in the frame.</li>
      </ul>
    </section>
  )
}
