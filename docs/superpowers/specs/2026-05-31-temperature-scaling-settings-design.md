# Temperature scaling, settings modal, fade-in — design

**Date:** 2026-05-31
**Status:** approved
**Branch:** `feat/temp-scaling-settings-modal`

## Motivation

Three user-driven changes, plus the refactors they require:

1. **More color.** In a mild climate like Santa Barbara (~50–80°F year-round) the
   fixed global temperature→hue range (−10°C→35°C) only ever produces the
   green/yellow-green middle of the spectrum. The user never sees the cool blues or
   hot reds. Rescaling the hue endpoints to the *local* climate fills the spectrum.
2. **Invert humidity.** Today low humidity → 4 squares, high humidity → 3. The user
   wants the opposite: high humidity → more squares.
3. **No blue flash on load.** Before weather resolves, the painting renders the
   `NEUTRAL` placeholder (hue 220, cold blue). The user wants the squares to fade in
   from the background-color "wall" instead.

These surface a UI gap (the °F/°C and Imperial/Metric toggles live only in the
Explore/About panel — live mode has no units control) and a scattered-preferences
problem (background toggle in the live TopBar, units in Explore). The fix consolidates
all preferences into one settings modal.

## Scope

Five changes, no new dependencies, no API key:

- **A.** Humidity inversion (composition).
- **B.** Three user-selectable temperature-scaling modes (daily / monthly / annual).
- **C.** Settings modal (gear icon, both modes).
- **D.** `SettingsContext` — consolidate units + background + scaling mode, persisted.
- **E.** Fade-in-from-wall on first load.

---

## A. Humidity inversion

`composition.ts` currently computes `t = clamp01((humidity - 35) / 30)`, where `t=0`
yields the 4-square template (`T4`, `opacities[3]=1`) and `t=1` yields the 3-square
template (`T3`, `opacities[3]=0`).

**Change:** `t = clamp01((65 - humidity) / 30)`. High humidity (≥65%) → `t=0` → 4
squares; low humidity (≤35%) → `t=1` → 3 squares. The 35–65% transition band is
unchanged; only the direction flips. Applies uniformly to live, Explore, and
Methodology since all call `buildComposition`.

**Tests:** update `composition.test.ts` direction assertions — high humidity now
asserts 4 visible squares, low humidity asserts the innermost square faded out.

---

## B. Temperature scaling — three modes

### Types (`engine/types.ts`)

```ts
export type ScalingMode = 'daily' | 'monthly' | 'annual'
export interface TempRange { coldC: number; hotC: number }
export interface ClimateRanges { annual: TempRange; monthly: TempRange[] } // monthly: length 12, index = month 0–11
```

### Range source per mode

- **daily** → `{ coldC: weather.lowC, hotC: weather.highC }` — already in the fetched
  `Weather`; no extra API call. Most color (the day's swing fills the spectrum).
- **monthly** → `climate.monthly[currentMonth]` (current calendar month).
- **annual** → `climate.annual`.

**Default mode:** `annual` (stable, honest mapping; user's stated preference). Switchable.

### Climate fetch (`data/climate.ts`)

`fetchClimateRange(lat, lon): Promise<ClimateRanges>`

- Hits the Open-Meteo **Archive API** (`https://archive-api.open-meteo.com/v1/archive`),
  free, no key:
  `?latitude=&longitude=&start_date=2015-01-01&end_date=2024-12-31`
  `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
  (Fixed 10-year window — deterministic, cache-friendly, avoids `Date` math.)
- Parses `daily.time` (ISO date strings, used to derive each day's month), plus
  `daily.temperature_2m_max` and `daily.temperature_2m_min`.
- **annual** = `{ coldC: p2(allMins), hotC: p98(allMaxes) }`.
- **monthly[m]** = `{ coldC: p2(minsInMonth[m]), hotC: p98(maxesInMonth[m]) }` for each
  month 0–11. Percentiles (not raw min/max) so a single freak day doesn't blow out the
  scale. If a month has no data (shouldn't happen over 10 years), fall back to the
  annual range for that month.
- Percentile helper `percentile(sorted: number[], p: number)` — linear interpolation
  on a pre-sorted array; lives in `data/climate.ts` (only consumer).
- Throws on non-200 or malformed payload; callers handle fallback.

### Hook (`hooks/useClimateRange.ts`)

`useClimateRange(lat, lon): ClimateRanges | null`

- On lat/lon change: check `localStorage` key `clim:v1:${lat.toFixed(2)},${lon.toFixed(2)}`.
  Hit → use cached `ClimateRanges` immediately. Miss → `fetchClimateRange`, store, set
  state. Climate normals barely move, so no TTL.
- Returns `null` until first resolution (live code falls back to the global range while null).
- On fetch error: leave state `null` (→ global-range fallback in `Stage`); do not cache.
- Guards against `localStorage` being unavailable/throwing (private mode) — treat as a miss.

### Mapper + environment range arg

```ts
// mappers.ts — defaults preserve current behavior
const DEFAULT_RANGE: TempRange = { coldC: -10, hotC: 35 }
export const tempToHue = (tempC: number, range: TempRange = DEFAULT_RANGE): number => {
  const t = clamp01((tempC - range.coldC) / (range.hotC - range.coldC))
  return COLD_HUE + t * (HOT_HUE - COLD_HUE)
}
```

```ts
// environment.ts
export const deriveEnvironment = (weather: Weather, sky: Sky, range?: TempRange): Environment => ({
  hueDeg: tempToHue(weather.temperatureC, range),
  ...
})
```

`COLD_HUE`/`HOT_HUE` stay constants; only the temperature endpoints become per-call.
Export `DEFAULT_RANGE` for reuse as the fallback. Guard against a degenerate range
(`hotC <= coldC`, e.g. a flat daily forecast): if so, fall back to `DEFAULT_RANGE`
inside `tempToHue` so the division never blows up.

### Active-range selection (in `Stage`)

```ts
const climate = useClimateRange(lat, lon)
const activeRange: TempRange | undefined =
  scalingMode === 'daily'   ? (weather ? { coldC: weather.lowC, hotC: weather.highC } : undefined)
: scalingMode === 'monthly' ? climate?.monthly[new Date().getMonth()]
:                             climate?.annual
// undefined → deriveEnvironment uses DEFAULT_RANGE
const env = weather && sky ? deriveEnvironment(weather, sky, activeRange) : NEUTRAL
```

**Explore / scenarios / Methodology keep the global default range** (no `range`
arg) — the methodology demo must still sweep full blue→red across the slider. Scaling
modes affect the live painting only. The "Color by" setting therefore has no visible
effect in About mode; this is acceptable and intentional.

**Tests:** `mappers.test.ts` — default behavior unchanged + custom-range cases +
degenerate-range fallback. `environment.test.ts` — default unchanged + range passed
through. `climate.test.ts` — percentile math, monthly bucketing from mocked payload,
error throw. `useClimateRange.test.ts` — cache hit/miss, fallback-on-error,
localStorage-unavailable.

---

## C. Settings modal (`components/SettingsModal.tsx`)

- Centered overlay with a dimmed backdrop. Closes on backdrop click and on **Esc**.
  Content click does not close. Painting keeps rendering behind the dim.
- Four rows, each a labeled segmented control:
  - **Temp** — °F / °C (`fahrenheit`)
  - **Units** — Imperial / Metric (`imperial`)
  - **Backdrop** — Dark / Light (`lightBg`)
  - **Color by** — Daily / Monthly / Annual (`scalingMode`)
- Opened by a **gear icon** added to the TopBar in **both** live and about modes.
  `settingsOpen` is `Stage` local state; the modal is rendered **once** at `Stage`
  level (outside the mode branch) so it overlays either view.
- Removes the standalone `BgToggle` from the live TopBar and the two unit `<button>`s
  from `Explore.tsx` (their state now lives in context and is edited via the modal).

**Tests:** `SettingsModal.test.tsx` — renders all four rows, each control updates
context, Esc closes, backdrop click closes, content click does not.

---

## D. `SettingsContext` (rename/extend `UnitsContext`)

- Rename `UnitsContext.tsx` → `SettingsContext.tsx`. Shape:
  `{ fahrenheit, imperial, lightBg, scalingMode, setFahrenheit, setImperial, setLightBg, setScalingMode }`.
- Defaults: `fahrenheit: true`, `imperial: true`, `lightBg: false`, `scalingMode: 'annual'`.
- **Persist** all four to `localStorage` under `settings:v1` (single JSON blob), loaded
  on init, written on change. Guard against unavailable/throwing storage.
- Keep `formatTemp` / `formatDegree` exported from the same module (no consumer change
  beyond the import path/hook name).
- Hook renamed `useUnits` → `useSettings`. Update imports in `App.tsx` and `Explore.tsx`.
- `lightBg` moves out of `Stage` local state into context (this is what lets one modal
  drive both modes). Backdrop choice is now remembered across reloads.

**Tests:** `SettingsContext.test.tsx` — defaults, each setter updates value, values
persist to and rehydrate from `localStorage`, storage-unavailable falls back to defaults.

---

## E. Fade-in from the wall

- Wrap the painting in a container whose `opacity` starts at `0` and transitions to `1`
  over ~1200ms ease. Reveal (`opacity: 1`) the first time real `weather && sky` resolve.
  Because the wall is the background color, the squares appear to emerge from it — dark
  or light follows `lightBg` automatically. Once revealed, stays revealed (city changes
  re-fetch weather but do not re-trigger the fade).
- **Failure fallback:** a ~2500ms timeout flips a `revealed` flag even if data never
  arrives, so the canvas never stays blank. In that path the `NEUTRAL` env shows.
- Retune `NEUTRAL` from `hue 220` (cold blue) to a low-chroma near-neutral gray, so the
  rare failure-reveal is quiet rather than blue. `NEUTRAL` no longer appears on the
  normal path at all (reveal is gated on real data).

**Tests:** `Stage`/`Painting` render — painting wrapper starts at `opacity: 0`;
after weather+sky resolve it is `opacity: 1`. (Timeout-fallback path covered by a
fake-timer test if cheaply expressible; otherwise noted as manual.)

---

## Data flow summary

```
usePlace ──lat/lon──┬─> useWeather ──> Weather (temp, lowC/highC, humidity, …)
                    └─> useClimateRange ──(Archive API, cached)──> ClimateRanges
SettingsContext ──> scalingMode, fahrenheit, imperial, lightBg

Stage:
  activeRange = pick(scalingMode, weather, climate)        // daily | monthly | annual | ⊥→global
  env  = deriveEnvironment(weather, sky, activeRange)      // ⊥ before load → NEUTRAL (gray)
  comp = buildComposition(humidity, sunElevation)          // humidity inverted
  reveal painting (opacity 0→1) on first real env
```

## Out of scope

- Reverse geocoding / auto-location (removed in a prior commit; not revisiting).
- Multi-year climate *normals* beyond the fixed 2015–2024 window.
- Animating the daily↔monthly↔annual switch (CSS already tweens the resulting hue).
- A full settings *page/route* — the modal is the chosen affordance.
