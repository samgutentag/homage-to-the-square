# Homage to the Square App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client-side React app that renders a procedurally-generated Josef Albers "Homage to the Square" painting whose color and composition drift continuously with the viewer's location, live weather, and the position of the sun — plus an embeddable "Explore" mode with sliders and scripted playthroughs.

**Architecture:** A pure, fully-tested engine (`signals → environment → palette + composition`) ported verbatim from the validated prototype at `prototype/dashboard.html`. React hooks acquire signals (geolocation, Open-Meteo weather, suncalc sun/moon, a minute clock); React components present the painting and mode-specific chrome (Live side-rail, Ambient fullscreen, Explore dashboard). Color is computed in OKLCH and emitted as native CSS `oklch()` strings so the browser tweens transitions.

**Tech Stack:** React + TypeScript + Vite + Tailwind. Vitest + @testing-library/react + jsdom for tests. `suncalc` for sun elevation + moon illumination. Open-Meteo for weather + geocoding (no API key). No backend.

**Reference:** `prototype/dashboard.html` is the source of truth for every mapping constant and formula. Keep ported values identical to it.

---

## File Structure

```
src/
  engine/
    types.ts          # Weather, Sky, Environment, OklchColor, Inset, Composition, ResolvedPlace, ViewMode, ScenarioSignals, Scenario
    color.ts          # clamp, clamp01, lerp, rotateHueToward, oklchCss
    mappers.ts        # tempToHue, grayness, skyToChroma, skyDayLightness, dayness, lightnessFor, sunToWarmShift, visibilityToFogContrast, isNight, moonToLift, sunToOffset
    environment.ts    # deriveEnvironment(weather, sky)
    palette.ts        # buildPalette(env) -> 4 OklchColors
    composition.ts    # T4, T3, lerpInset, buildComposition(humidity, sunElevationDeg)
    title.ts          # generateTitle(env, date)
    sun.ts            # elevationFor(date, lat, lon), moonIlluminationFor(date)
    scenarios.ts      # hourToElev, envFromSignals, SCENARIOS[6], timelineGradient(scenario)
  data/
    weather.ts        # fetchWeather(lat, lon) -> Weather (Open-Meteo)
    location.ts       # geocodeCity(name), ipLocate()
  hooks/
    useClock.ts       # minute tick
    useGeolocation.ts # browser geo -> IP fallback -> manual city
    useWeather.ts     # poll ~12 min, last-good retention
    useSky.ts         # recompute elevation + moon per tick
  components/
    Painting.tsx      # 4 nested square divs from composition + palette
    SideRail.tsx      # location / weather / hour / title + ModePicker
    ModePicker.tsx    # Live / Ambient / Explore
    Overlay.tsx       # auto-hiding chrome for Ambient
    Timeline.tsx      # read-only color band + playhead for a running scenario
    Explore.tsx       # sliders + unit toggles + playthroughs + Timeline
  ModeContext.tsx     # ViewMode provider/hook
  App.tsx             # wires pipeline + hooks + modes
  main.tsx            # entry
  index.css           # Tailwind + base
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `index.html`, `src/test/setup.ts`, `src/engine/smoke.test.ts`

- [ ] **Step 1: Scaffold Vite React-TS app**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
```
If prompted about the non-empty directory, choose "Ignore files and continue".

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install suncalc
npm install -D @types/suncalc vitest @testing-library/react @testing-library/jest-dom jsdom tailwindcss @tailwindcss/vite
```

> Dependency note for Sam: the only runtime dep is **suncalc**. Open-Meteo is plain `fetch`, OKLCH is native CSS, no color library.

- [ ] **Step 3: Configure Tailwind v4 + Vite**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
```
(`base: './'` keeps asset paths relative so the build works both under the dev-domain root and inside an iframe embed.)

Replace `src/index.css`:
```css
@import 'tailwindcss';

html, body, #root { height: 100%; margin: 0; }
body { background: #0d0d0d; }
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
})
```

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Merge into `package.json` `"scripts"`:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 5: Add a smoke test**

Create `src/engine/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
describe('scaffold', () => { it('runs vitest', () => { expect(1 + 1).toBe(2) }) })
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

### Task 2: Core types

**Files:**
- Create: `src/engine/types.ts`

- [ ] **Step 1: Define types**

Create `src/engine/types.ts`:
```ts
export interface Weather {
  temperatureC: number
  weatherCode: number
  cloudCover: number // 0..100
  precipitation: number // mm
  visibilityM: number // meters
  relativeHumidity: number // 0..100
  isDay: boolean
}

export interface Sky {
  sunElevationDeg: number // -90..90
  moonIllumination: number // 0..1
}

export interface Environment {
  hueDeg: number
  chroma: number // 0..1
  lightness: number // 0..1
  warmShift: number // 0..1
  fogContrast: number // 0..1
  moonLift: number // 0..1
}

export interface OklchColor { l: number; c: number; h: number }

export interface Inset { top: number; left: number; right: number; bottom: number } // percent

/** Always 4 squares; opacities[3] fades toward 0 as the 3-square format takes over. */
export interface Composition { insets: Inset[]; opacities: number[] }

export interface ResolvedPlace { lat: number; lon: number; name: string }

export type ViewMode = 'live' | 'ambient' | 'explore'

/** Canonical (metric) signal values a scenario emits at a point in its loop. */
export interface ScenarioSignals {
  hour: number // 0..24
  tempC: number
  cloud: number // 0..100
  precipMm: number
  visM: number
  moon: number // 0..1
  humidity: number // 0..100
}

export interface Scenario {
  id: string
  name: string
  durationMs: number
  at: (p: number) => ScenarioSignals
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/types.ts
git commit -m "feat: core engine types"
```

---

### Task 3: Color helpers

**Files:**
- Create: `src/engine/color.ts`
- Test: `src/engine/color.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/color.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { clamp, clamp01, lerp, oklchCss, rotateHueToward } from './color'

describe('clamp / clamp01 / lerp', () => {
  it('clamps and interpolates', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
})

describe('oklchCss', () => {
  it('formats an OKLCH string', () => {
    expect(oklchCss({ l: 0.5, c: 0.1, h: 120 })).toBe('oklch(0.5000 0.1000 120.00)')
  })
})

describe('rotateHueToward', () => {
  it('returns source at t=0 and target at t=1', () => {
    expect(rotateHueToward(200, 70, 0)).toBe(200)
    expect(rotateHueToward(200, 70, 1)).toBeCloseTo(70, 5)
  })
  it('takes the shortest path across 0/360', () => {
    expect(rotateHueToward(350, 10, 0.5)).toBeCloseTo(0, 5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- color`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/engine/color.ts`:
```ts
import type { OklchColor } from './types'

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v))
export const clamp01 = (v: number): number => clamp(v, 0, 1)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const oklchCss = (c: OklchColor): string =>
  `oklch(${c.l.toFixed(4)} ${c.c.toFixed(4)} ${c.h.toFixed(2)})`

export const rotateHueToward = (from: number, to: number, t: number): number => {
  const delta = ((to - from + 540) % 360) - 180
  const result = from + delta * t
  return ((result % 360) + 360) % 360
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- color`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/color.ts src/engine/color.test.ts
git commit -m "feat: OKLCH color helpers"
```

---

### Task 4: Signal mappers

**Files:**
- Create: `src/engine/mappers.ts`
- Test: `src/engine/mappers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/mappers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  tempToHue, skyToChroma, skyDayLightness, lightnessFor,
  sunToWarmShift, visibilityToFogContrast, isNight, moonToLift, sunToOffset,
} from './mappers'

describe('tempToHue', () => {
  it('cold -> cool, hot -> warm, clamped', () => {
    expect(tempToHue(-10)).toBeCloseTo(250, 0)
    expect(tempToHue(35)).toBeCloseTo(50, 0)
    expect(tempToHue(0)).toBeGreaterThan(tempToHue(20))
    expect(tempToHue(-50)).toBeCloseTo(250, 0)
    expect(tempToHue(99)).toBeCloseTo(50, 0)
  })
})

describe('skyToChroma', () => {
  it('high when clear, low when overcast', () => {
    expect(skyToChroma(0, 0)).toBeGreaterThan(0.9)
    expect(skyToChroma(100, 0)).toBeLessThan(0.3)
    expect(skyToChroma(50, 5)).toBeLessThan(skyToChroma(50, 0))
  })
})

describe('skyDayLightness', () => {
  it('bright when clear, dark when overcast', () => {
    expect(skyDayLightness(0, 0)).toBeCloseTo(0.8, 1)
    expect(skyDayLightness(100, 0)).toBeLessThan(0.45)
  })
})

describe('lightnessFor (day/night gate)', () => {
  it('is dark at night regardless of weather', () => {
    expect(lightnessFor(0, 0, -30)).toBeLessThan(0.2)
  })
  it('matches daytime sky brightness when the sun is well up', () => {
    expect(lightnessFor(0, 0, 40)).toBeCloseTo(0.8, 1)
  })
  it('does not change with sun height once the sun is well up', () => {
    expect(lightnessFor(0, 0, 20)).toBeCloseTo(lightnessFor(0, 0, 60), 5)
  })
})

describe('sunToWarmShift', () => {
  it('peaks at the horizon, zero high or deep', () => {
    expect(sunToWarmShift(0)).toBeCloseTo(1, 5)
    expect(sunToWarmShift(45)).toBe(0)
    expect(sunToWarmShift(-30)).toBe(0)
  })
})

describe('visibilityToFogContrast', () => {
  it('full in clear air, compressed in fog, never zero', () => {
    expect(visibilityToFogContrast(20000)).toBe(1)
    const fog = visibilityToFogContrast(200)
    expect(fog).toBeLessThan(0.3)
    expect(fog).toBeGreaterThan(0)
  })
})

describe('isNight / moonToLift', () => {
  it('night below civil twilight; moon lifts only at night', () => {
    expect(isNight(-10)).toBe(true)
    expect(isNight(5)).toBe(false)
    expect(moonToLift(0.8, true)).toBeCloseTo(0.8, 5)
    expect(moonToLift(1, false)).toBe(0)
  })
})

describe('sunToOffset', () => {
  it('pushes down at low sun, centers at high sun', () => {
    expect(sunToOffset(60)).toBeCloseTo(0, 1)
    expect(sunToOffset(-10)).toBeCloseTo(8, 1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mappers`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation (values copied from the prototype)**

Create `src/engine/mappers.ts`:
```ts
import { clamp, clamp01, lerp } from './color'

const COLD_HUE = 250
const HOT_HUE = 50
const COLD_TEMP = -10
const HOT_TEMP = 35

export const tempToHue = (tempC: number): number => {
  const t = clamp01((tempC - COLD_TEMP) / (HOT_TEMP - COLD_TEMP))
  return COLD_HUE + t * (HOT_HUE - COLD_HUE)
}

export const grayness = (cloudCover: number, precipitation: number): number =>
  clamp01((cloudCover / 100) * 0.8 + (precipitation / 10) * 0.5)

export const skyToChroma = (cloudCover: number, precipitation: number): number =>
  clamp01(1 - grayness(cloudCover, precipitation))

export const skyDayLightness = (cloudCover: number, precipitation: number): number =>
  lerp(0.8, 0.34, grayness(cloudCover, precipitation))

/** 1 when the sun is well up (>6°), 0 once below civil twilight (-6°). */
export const dayness = (elevationDeg: number): number => clamp01((elevationDeg + 6) / 12)

export const lightnessFor = (
  cloudCover: number,
  precipitation: number,
  elevationDeg: number,
): number => lerp(0.14, skyDayLightness(cloudCover, precipitation), dayness(elevationDeg))

export const sunToWarmShift = (elevationDeg: number): number =>
  Math.max(0, 1 - Math.abs(elevationDeg) / 10)

export const visibilityToFogContrast = (visibilityM: number): number =>
  clamp(visibilityM / 10000, 0.15, 1)

export const isNight = (elevationDeg: number): boolean => elevationDeg < -6

export const moonToLift = (illumination: number, night: boolean): number =>
  night ? clamp01(illumination) : 0

/** Vertical offset (%) applied to inner squares: pushed down at low sun, centered high. */
export const sunToOffset = (elevationDeg: number): number =>
  lerp(8, 0, clamp01((elevationDeg + 10) / 70))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- mappers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/mappers.ts src/engine/mappers.test.ts
git commit -m "feat: signal mappers"
```

---

### Task 5: deriveEnvironment

**Files:**
- Create: `src/engine/environment.ts`
- Test: `src/engine/environment.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/environment.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { deriveEnvironment } from './environment'
import type { Weather, Sky } from './types'

const clearWeather: Weather = {
  temperatureC: 20, weatherCode: 0, cloudCover: 0, precipitation: 0,
  visibilityM: 20000, relativeHumidity: 40, isDay: true,
}

describe('deriveEnvironment', () => {
  it('composes all signals (clear midday)', () => {
    const sky: Sky = { sunElevationDeg: 40, moonIllumination: 0.5 }
    const env = deriveEnvironment(clearWeather, sky)
    expect(env.chroma).toBeGreaterThan(0.9)
    expect(env.lightness).toBeGreaterThan(0.7)
    expect(env.fogContrast).toBe(1)
    expect(env.warmShift).toBe(0)
    expect(env.moonLift).toBe(0)
  })

  it('applies moon lift and darkness at night', () => {
    const sky: Sky = { sunElevationDeg: -20, moonIllumination: 0.9 }
    const env = deriveEnvironment(clearWeather, sky)
    expect(env.moonLift).toBeCloseTo(0.9, 5)
    expect(env.lightness).toBeLessThan(0.2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- environment`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/engine/environment.ts`:
```ts
import type { Environment, Sky, Weather } from './types'
import {
  tempToHue, skyToChroma, lightnessFor, sunToWarmShift,
  visibilityToFogContrast, isNight, moonToLift,
} from './mappers'

export const deriveEnvironment = (weather: Weather, sky: Sky): Environment => ({
  hueDeg: tempToHue(weather.temperatureC),
  chroma: skyToChroma(weather.cloudCover, weather.precipitation),
  lightness: lightnessFor(weather.cloudCover, weather.precipitation, sky.sunElevationDeg),
  warmShift: sunToWarmShift(sky.sunElevationDeg),
  fogContrast: visibilityToFogContrast(weather.visibilityM),
  moonLift: moonToLift(sky.moonIllumination, isNight(sky.sunElevationDeg)),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- environment`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/environment.ts src/engine/environment.test.ts
git commit -m "feat: deriveEnvironment"
```

---

### Task 6: buildPalette

**Files:**
- Create: `src/engine/palette.ts`
- Test: `src/engine/palette.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/palette.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildPalette } from './palette'
import type { Environment } from './types'

const env: Environment = {
  hueDeg: 200, chroma: 0.7, lightness: 0.5, warmShift: 0, fogContrast: 1, moonLift: 0,
}

describe('buildPalette', () => {
  it('returns four colors', () => {
    expect(buildPalette(env)).toHaveLength(4)
  })
  it('produces a monotonic lightness ramp', () => {
    const p = buildPalette(env)
    for (let i = 1; i < p.length; i++) expect(p[i].l).toBeGreaterThan(p[i - 1].l)
  })
  it('fog compresses the lightness spread', () => {
    const spread = (p: { l: number }[]) => p[3].l - p[0].l
    expect(spread(buildPalette({ ...env, fogContrast: 0.2 }))).toBeLessThan(
      spread(buildPalette({ ...env, fogContrast: 1 })),
    )
  })
  it('higher chroma yields more saturation', () => {
    expect(buildPalette({ ...env, chroma: 0.9 })[0].c).toBeGreaterThan(
      buildPalette({ ...env, chroma: 0.1 })[0].c,
    )
  })
  it('moon lift raises the innermost square', () => {
    expect(buildPalette({ ...env, lightness: 0.12, moonLift: 0.9 })[3].l).toBeGreaterThan(
      buildPalette({ ...env, lightness: 0.12, moonLift: 0 })[3].l,
    )
  })
  it('keeps channels in bounds', () => {
    for (const c of buildPalette({ ...env, lightness: 0.95, moonLift: 1 })) {
      expect(c.l).toBeGreaterThanOrEqual(0.05)
      expect(c.l).toBeLessThanOrEqual(0.97)
      expect(c.c).toBeGreaterThanOrEqual(0)
      expect(c.h).toBeGreaterThanOrEqual(0)
      expect(c.h).toBeLessThan(360)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- palette`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation (copied from the prototype)**

Create `src/engine/palette.ts`:
```ts
import type { Environment, OklchColor } from './types'
import { clamp, rotateHueToward } from './color'

const WARM_TARGET_HUE = 70

/** Four nested-square colors with a monotonic lightness ramp, Albers value steps,
 *  fog-compressed contrast, golden-hour hue rotation, and night-only moon lift. */
export const buildPalette = (env: Environment): OklchColor[] => {
  const baseL = 0.2 + env.lightness * 0.45
  const step = 0.12 * env.fogContrast
  const baseChroma = 0.02 + env.chroma * 0.16
  const hue = rotateHueToward(env.hueDeg, WARM_TARGET_HUE, env.warmShift * 0.6)

  const colors: OklchColor[] = []
  for (let i = 0; i < 4; i++) {
    const l = baseL + i * step
    const c = Math.max(0, baseChroma * (1 - i * 0.12))
    const h = (((hue + i * 6) % 360) + 360) % 360
    colors.push({ l: clamp(l, 0.05, 0.97), c, h })
  }
  if (env.moonLift > 0) {
    const inner = colors[3]
    inner.l = clamp(inner.l + env.moonLift * 0.25, 0.05, 0.97)
    inner.c = inner.c + env.moonLift * 0.03
  }
  return colors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- palette`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/palette.ts src/engine/palette.test.ts
git commit -m "feat: buildPalette with Albers color logic"
```

---

### Task 7: buildComposition

**Files:**
- Create: `src/engine/composition.ts`
- Test: `src/engine/composition.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/composition.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildComposition } from './composition'

describe('buildComposition', () => {
  it('returns four insets and four opacities', () => {
    const c = buildComposition(30, 40)
    expect(c.insets).toHaveLength(4)
    expect(c.opacities).toHaveLength(4)
  })
  it('keeps the innermost square solid at low humidity (4-square)', () => {
    expect(buildComposition(10, 40).opacities[3]).toBeCloseTo(1, 5)
  })
  it('fades the innermost square out at high humidity (3-square)', () => {
    expect(buildComposition(90, 40).opacities[3]).toBeCloseTo(0, 5)
  })
  it('low sun pushes the inner squares further down (larger top inset)', () => {
    const high = buildComposition(30, 60)
    const low = buildComposition(30, -10)
    expect(low.insets[1].top).toBeGreaterThan(high.insets[1].top)
  })
  it('the ground square is always full-bleed and opaque', () => {
    const c = buildComposition(50, 0)
    expect(c.insets[0]).toEqual({ top: 0, left: 0, right: 0, bottom: 0 })
    expect(c.opacities[0]).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- composition`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation (templates + blend copied from the prototype)**

Create `src/engine/composition.ts`:
```ts
import type { Composition, Inset } from './types'
import { clamp01, lerp } from './color'
import { sunToOffset } from './mappers'

const ground: Inset = { top: 0, left: 0, right: 0, bottom: 0 }

/** Authentic pushed-down Albers templates: top margin wide, bottom narrow, true squares. */
const T4: Inset[] = [
  ground,
  { top: 14, left: 11, right: 11, bottom: 8 },
  { top: 29, left: 22, right: 22, bottom: 15 },
  { top: 43, left: 33, right: 33, bottom: 23 },
]
const T3: Inset[] = [
  ground,
  { top: 18, left: 14, right: 14, bottom: 10 },
  { top: 39, left: 30, right: 30, bottom: 21 },
  { top: 49, left: 39, right: 39, bottom: 29 },
]

const lerpInset = (a: Inset, b: Inset, t: number): Inset => ({
  top: lerp(a.top, b.top, t),
  left: lerp(a.left, b.left, t),
  right: lerp(a.right, b.right, t),
  bottom: lerp(a.bottom, b.bottom, t),
})

/**
 * Blend between the 4- and 3-square templates by humidity (transition band 35..65%),
 * then push the inner stack down by the sun-driven offset. Always four squares;
 * the innermost fades out as the 3-square format takes over.
 */
export const buildComposition = (humidity: number, sunElevationDeg: number): Composition => {
  const t = clamp01((humidity - 35) / 30)
  const shift = sunToOffset(sunElevationDeg)
  const insets: Inset[] = T4.map((a, i) => {
    const blended = i === 0 ? ground : lerpInset(a, T3[i], t)
    if (i === 0) return blended
    return { ...blended, top: blended.top + shift, bottom: Math.max(2, blended.bottom - shift) }
  })
  return { insets, opacities: [1, 1, 1, 1 - t] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- composition`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/composition.ts src/engine/composition.test.ts
git commit -m "feat: buildComposition (humidity blend + sun offset)"
```

---

### Task 8: generateTitle

**Files:**
- Create: `src/engine/title.ts`
- Test: `src/engine/title.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/title.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateTitle, timeOfDayWord } from './title'
import type { Environment } from './types'

const warmClear: Environment = {
  hueDeg: 60, chroma: 0.9, lightness: 0.5, warmShift: 0.2, fogContrast: 1, moonLift: 0,
}

describe('timeOfDayWord', () => {
  it('labels hour bands', () => {
    expect(timeOfDayWord(5)).toBe('Dawn')
    expect(timeOfDayWord(9)).toBe('Morning')
    expect(timeOfDayWord(13)).toBe('Midday')
    expect(timeOfDayWord(16)).toBe('Afternoon')
    expect(timeOfDayWord(19)).toBe('Dusk')
    expect(timeOfDayWord(23)).toBe('Night')
  })
})

describe('generateTitle', () => {
  it('names the piece from conditions + hour', () => {
    expect(generateTitle(warmClear, new Date('2026-05-29T16:42:00'))).toBe(
      'Homage to the Square: Warm Clarity, Afternoon',
    )
    const coolOvercast: Environment = { ...warmClear, hueDeg: 240, chroma: 0.1 }
    expect(generateTitle(coolOvercast, new Date('2026-05-29T23:00:00'))).toBe(
      'Homage to the Square: Cool Overcast, Night',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- title`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/engine/title.ts`:
```ts
import type { Environment } from './types'

const warmthWord = (hueDeg: number): string =>
  hueDeg < 110 ? 'Warm' : hueDeg < 190 ? 'Temperate' : 'Cool'

const clarityWord = (chroma: number): string =>
  chroma > 0.6 ? 'Clarity' : chroma > 0.3 ? 'Haze' : 'Overcast'

export const timeOfDayWord = (hour: number): string => {
  if (hour < 7) return 'Dawn'
  if (hour < 11) return 'Morning'
  if (hour < 15) return 'Midday'
  if (hour < 18) return 'Afternoon'
  if (hour < 21) return 'Dusk'
  return 'Night'
}

export const generateTitle = (env: Environment, date: Date): string =>
  `Homage to the Square: ${warmthWord(env.hueDeg)} ${clarityWord(env.chroma)}, ${timeOfDayWord(date.getHours())}`
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- title`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/title.ts src/engine/title.test.ts
git commit -m "feat: generateTitle"
```

---

### Task 9: Sun module (suncalc)

**Files:**
- Create: `src/engine/sun.ts`
- Test: `src/engine/sun.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/sun.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { elevationFor, moonIlluminationFor } from './sun'

const LAT = 37.8
const LON = -122.27

describe('elevationFor', () => {
  it('is positive around local midday and negative around local midnight', () => {
    expect(elevationFor(new Date('2026-06-21T19:00:00Z'), LAT, LON)).toBeGreaterThan(0)
    expect(elevationFor(new Date('2026-06-21T08:00:00Z'), LAT, LON)).toBeLessThan(0)
  })
})

describe('moonIlluminationFor', () => {
  it('is within 0..1', () => {
    const m = moonIlluminationFor(new Date('2026-06-21T08:00:00Z'))
    expect(m).toBeGreaterThanOrEqual(0)
    expect(m).toBeLessThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sun`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/engine/sun.ts`:
```ts
import SunCalc from 'suncalc'

const RAD_TO_DEG = 180 / Math.PI

/** The swappable `time + place -> elevation` boundary (Explore demo substitutes hourToElev). */
export const elevationFor = (date: Date, lat: number, lon: number): number =>
  SunCalc.getPosition(date, lat, lon).altitude * RAD_TO_DEG

export const moonIlluminationFor = (date: Date): number =>
  SunCalc.getMoonIllumination(date).fraction
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sun`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/sun.ts src/engine/sun.test.ts
git commit -m "feat: suncalc sun + moon module"
```

---

### Task 10: Scenarios + timeline sampler

**Files:**
- Create: `src/engine/scenarios.ts`
- Test: `src/engine/scenarios.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/scenarios.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { hourToElev, envFromSignals, SCENARIOS, timelineGradient } from './scenarios'

describe('hourToElev', () => {
  it('peaks at noon, troughs at midnight, zero at sunrise/sunset', () => {
    expect(hourToElev(12)).toBeCloseTo(60, 0)
    expect(hourToElev(0)).toBeCloseTo(-60, 0)
    expect(hourToElev(6)).toBeCloseTo(0, 1)
    expect(hourToElev(18)).toBeCloseTo(0, 1)
  })
})

describe('SCENARIOS', () => {
  it('has six scenarios with stable ids and loopable signals', () => {
    expect(SCENARIOS).toHaveLength(6)
    for (const s of SCENARIOS) {
      const start = s.at(0)
      const end = s.at(1)
      expect(start.hour).toBeCloseTo(end.hour, 5) // loops seamlessly
      expect(s.durationMs).toBeGreaterThan(0)
    }
  })
})

describe('envFromSignals', () => {
  it('produces a valid environment', () => {
    const env = envFromSignals(SCENARIOS[0].at(0.5))
    expect(env.chroma).toBeGreaterThanOrEqual(0)
    expect(env.lightness).toBeGreaterThanOrEqual(0)
  })
})

describe('timelineGradient', () => {
  it('builds a multi-stop linear-gradient string', () => {
    const g = timelineGradient(SCENARIOS[0])
    expect(g.startsWith('linear-gradient(90deg,')).toBe(true)
    expect(g).toContain('oklch(')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scenarios`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation (scenarios copied from the prototype)**

Create `src/engine/scenarios.ts`:
```ts
import type { Environment, Scenario, ScenarioSignals } from './types'
import { clamp01 } from './color'
import {
  tempToHue, skyToChroma, lightnessFor, sunToWarmShift,
  visibilityToFogContrast, isNight, moonToLift,
} from './mappers'
import { buildPalette } from './palette'
import { oklchCss } from './color'

/** Demo-only: time of day -> approximate sun elevation (production uses suncalc). */
export const hourToElev = (hour: number): number => 60 * Math.sin((2 * Math.PI * (hour - 6)) / 24)

/** Build an Environment directly from scenario signals (used by Explore + timeline). */
export const envFromSignals = (s: ScenarioSignals): Environment => {
  const elev = hourToElev(s.hour)
  return {
    hueDeg: tempToHue(s.tempC),
    chroma: skyToChroma(s.cloud, s.precipMm),
    lightness: lightnessFor(s.cloud, s.precipMm, elev),
    warmShift: sunToWarmShift(elev),
    fogContrast: visibilityToFogContrast(s.visM),
    moonLift: moonToLift(s.moon, isNight(elev)),
  }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'clearDay', name: 'Clear Day Arc', durationMs: 14000,
    at: (p) => ({ hour: p * 24, tempC: 18, cloud: 8, precipMm: 0, visM: 20000, moon: 0.3, humidity: 30 }),
  },
  {
    id: 'thunderstorm', name: 'Afternoon Thunderstorm', durationMs: 13000,
    at: (p) => { const k = Math.sin(Math.PI * p); return { hour: 15.5, tempC: 22 - k * 6, cloud: 10 + k * 88, precipMm: k * 8, visM: 20000 - k * 18500, moon: 0, humidity: 60 } },
  },
  {
    id: 'fullMoon', name: 'Full Moon Night', durationMs: 12000,
    at: (p) => ({ hour: 1, tempC: 11, cloud: 12, precipMm: 0, visM: 20000, moon: 0.5 - 0.5 * Math.cos(2 * Math.PI * p), humidity: 35 }),
  },
  {
    id: 'rollingFog', name: 'Rolling Fog', durationMs: 12000,
    at: (p) => { const k = Math.sin(Math.PI * p); return { hour: 11, tempC: 13, cloud: 45, precipMm: 0, visM: 20000 - k * 19500, moon: 0, humidity: 40 } },
  },
  {
    id: 'heatWave', name: 'Heat Wave', durationMs: 12000,
    at: (p) => { const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * p); return { hour: 13, tempC: 28 + k * 12, cloud: 5, precipMm: 0, visM: 20000, moon: 0, humidity: 25 } },
  },
  {
    id: 'humidDrift', name: 'Humid Drift (3↔4)', durationMs: 9000,
    at: (p) => ({ hour: 14, tempC: 20, cloud: 15, precipMm: 0, visM: 20000, moon: 0, humidity: (Math.sin(2 * Math.PI * p - Math.PI / 2) * 0.5 + 0.5) * 100 }),
  },
]

/** A horizontal color band of a representative square sampled across the scenario loop. */
export const timelineGradient = (scenario: Scenario): string => {
  const N = 24
  const stops: string[] = []
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1)
    const pal = buildPalette(envFromSignals(scenario.at(p)))
    stops.push(`${oklchCss(pal[2])} ${(p * 100).toFixed(1)}%`)
  }
  return `linear-gradient(90deg,${stops.join(',')})`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scenarios`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/scenarios.ts src/engine/scenarios.test.ts
git commit -m "feat: scenarios + timeline gradient sampler"
```

---

### Task 11: Weather client (Open-Meteo)

**Files:**
- Create: `src/data/weather.ts`
- Test: `src/data/weather.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/data/weather.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWeather } from './weather'

const sample = {
  current: {
    temperature_2m: 18.4, weather_code: 3, cloud_cover: 75, precipitation: 0.2,
    visibility: 14000, relative_humidity_2m: 66, is_day: 1,
  },
}

afterEach(() => vi.restoreAllMocks())

describe('fetchWeather', () => {
  it('maps Open-Meteo current weather into Weather', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sample) }))
    expect(await fetchWeather(37.8, -122.27)).toEqual({
      temperatureC: 18.4, weatherCode: 3, cloudCover: 75, precipitation: 0.2,
      visibilityM: 14000, relativeHumidity: 66, isDay: true,
    })
  })
  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchWeather(0, 0)).rejects.toThrow(/weather/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- weather`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/data/weather.ts`:
```ts
import type { Weather } from '../engine/types'

const CURRENT_FIELDS =
  'temperature_2m,weather_code,cloud_cover,precipitation,visibility,relative_humidity_2m,is_day'

export const fetchWeather = async (lat: number, lon: number): Promise<Weather> => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${CURRENT_FIELDS}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`weather fetch failed: ${res.status}`)
  const c = (await res.json()).current
  return {
    temperatureC: c.temperature_2m,
    weatherCode: c.weather_code,
    cloudCover: c.cloud_cover,
    precipitation: c.precipitation,
    visibilityM: c.visibility,
    relativeHumidity: c.relative_humidity_2m,
    isDay: c.is_day === 1,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- weather`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/weather.ts src/data/weather.test.ts
git commit -m "feat: Open-Meteo weather client"
```

---

### Task 12: Location module

**Files:**
- Create: `src/data/location.ts`
- Test: `src/data/location.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/data/location.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { geocodeCity, ipLocate } from './location'

afterEach(() => vi.restoreAllMocks())

describe('geocodeCity', () => {
  it('resolves the first match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ latitude: 52.52, longitude: 13.41, name: 'Berlin', country: 'Germany' }] }),
    }))
    expect(await geocodeCity('Berlin')).toEqual({ lat: 52.52, lon: 13.41, name: 'Berlin, Germany' })
  })
  it('throws when there are no matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
    await expect(geocodeCity('zzzz')).rejects.toThrow(/no match/i)
  })
})

describe('ipLocate', () => {
  it('maps an IP response into a place', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latitude: 37.8, longitude: -122.27, city: 'Oakland', region: 'California' }),
    }))
    expect(await ipLocate()).toEqual({ lat: 37.8, lon: -122.27, name: 'Oakland, California' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- location`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/data/location.ts`:
```ts
import type { ResolvedPlace } from '../engine/types'

export const geocodeCity = async (name: string): Promise<ResolvedPlace> => {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`geocode failed: ${res.status}`)
  const hit = (await res.json()).results?.[0]
  if (!hit) throw new Error(`no match for "${name}"`)
  return { lat: hit.latitude, lon: hit.longitude, name: [hit.name, hit.country].filter(Boolean).join(', ') }
}

export const ipLocate = async (): Promise<ResolvedPlace> => {
  const res = await fetch('https://ipapi.co/json/')
  if (!res.ok) throw new Error(`ip locate failed: ${res.status}`)
  const j = await res.json()
  return { lat: j.latitude, lon: j.longitude, name: [j.city, j.region].filter(Boolean).join(', ') }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- location`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/location.ts src/data/location.test.ts
git commit -m "feat: geocoding + IP-fallback location module"
```

---

### Task 13: Acquisition hooks

**Files:**
- Create: `src/hooks/useClock.ts`, `src/hooks/useGeolocation.ts`, `src/hooks/useWeather.ts`, `src/hooks/useSky.ts`
- Test: `src/hooks/useClock.test.ts`, `src/hooks/useGeolocation.test.ts`

- [ ] **Step 1: Write the failing test for useClock**

Create `src/hooks/useClock.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClock } from './useClock'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useClock', () => {
  it('advances by the interval', () => {
    const { result } = renderHook(() => useClock(60000))
    const first = result.current.getTime()
    act(() => vi.advanceTimersByTime(60000))
    expect(result.current.getTime()).toBeGreaterThan(first)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useClock`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement useClock**

Create `src/hooks/useClock.ts`:
```ts
import { useEffect, useState } from 'react'

export const useClock = (intervalMs = 60000): Date => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useClock`
Expected: PASS.

- [ ] **Step 5: Write the failing test for useGeolocation**

Create `src/hooks/useGeolocation.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGeolocation } from './useGeolocation'

afterEach(() => vi.restoreAllMocks())

describe('useGeolocation', () => {
  it('resolves browser coordinates into a place', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) =>
          ok({ coords: { latitude: 37.8, longitude: -122.27 } }),
      },
    })
    const { result } = renderHook(() => useGeolocation())
    await waitFor(() => expect(result.current.place).not.toBeNull())
    expect(result.current.place?.lat).toBeCloseTo(37.8, 5)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- useGeolocation`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement useGeolocation**

Create `src/hooks/useGeolocation.ts`:
```ts
import { useEffect, useState, useCallback } from 'react'
import type { ResolvedPlace } from '../engine/types'
import { ipLocate, geocodeCity } from '../data/location'

interface GeoState {
  place: ResolvedPlace | null
  error: string | null
  setCity: (name: string) => Promise<void>
}

const browserCoords = (): Promise<{ lat: number; lon: number }> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(e),
    )
  })

export const useGeolocation = (): GeoState => {
  const [place, setPlace] = useState<ResolvedPlace | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setCity = useCallback(async (name: string) => {
    try {
      setPlace(await geocodeCity(name))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { lat, lon } = await browserCoords()
        if (!cancelled) setPlace({ lat, lon, name: 'Your location' })
      } catch {
        try {
          const ip = await ipLocate()
          if (!cancelled) setPlace(ip)
        } catch (e) {
          if (!cancelled) setError((e as Error).message)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { place, error, setCity }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- useGeolocation`
Expected: PASS.

- [ ] **Step 9: Implement useWeather**

Create `src/hooks/useWeather.ts`:
```ts
import { useEffect, useState } from 'react'
import type { Weather } from '../engine/types'
import { fetchWeather } from '../data/weather'

const POLL_MS = 12 * 60 * 1000

interface WeatherState { weather: Weather | null; stale: boolean }

export const useWeather = (lat: number | null, lon: number | null): WeatherState => {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (lat == null || lon == null) return
    let cancelled = false
    const load = async () => {
      try {
        const w = await fetchWeather(lat, lon)
        if (!cancelled) { setWeather(w); setStale(false) }
      } catch {
        if (!cancelled) setStale(true)
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [lat, lon])

  return { weather, stale }
}
```

- [ ] **Step 10: Implement useSky**

Create `src/hooks/useSky.ts`:
```ts
import { useMemo } from 'react'
import type { Sky } from '../engine/types'
import { elevationFor, moonIlluminationFor } from '../engine/sun'

export const useSky = (date: Date, lat: number | null, lon: number | null): Sky | null =>
  useMemo(() => {
    if (lat == null || lon == null) return null
    return {
      sunElevationDeg: elevationFor(date, lat, lon),
      moonIllumination: moonIlluminationFor(date),
    }
  }, [date, lat, lon])
```

- [ ] **Step 11: Run the full suite**

Run: `npm test`
Expected: PASS — engine, data, and hook tests green.

- [ ] **Step 12: Commit**

```bash
git add src/hooks
git commit -m "feat: acquisition hooks (clock, geolocation, weather, sky)"
```

---

### Task 14: Painting component

**Files:**
- Create: `src/components/Painting.tsx`
- Test: `src/components/Painting.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Painting.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Painting } from './Painting'
import { buildComposition } from '../engine/composition'
import { buildPalette } from '../engine/palette'
import type { Environment } from '../engine/types'

const env: Environment = { hueDeg: 200, chroma: 0.7, lightness: 0.5, warmShift: 0, fogContrast: 1, moonLift: 0 }

describe('Painting', () => {
  it('renders four squares with oklch backgrounds', () => {
    const { container } = render(
      <Painting composition={buildComposition(30, 40)} palette={buildPalette(env)} />,
    )
    const squares = container.querySelectorAll('[data-square]')
    expect(squares).toHaveLength(4)
    expect((squares[0] as HTMLElement).style.backgroundColor).toContain('oklch')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Painting`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/components/Painting.tsx`:
```tsx
import type { Composition, OklchColor } from '../engine/types'
import { oklchCss } from '../engine/color'

interface PaintingProps { composition: Composition; palette: OklchColor[] }

export const Painting = ({ composition, palette }: PaintingProps) => (
  <div
    className="relative h-full max-h-full"
    style={{ aspectRatio: '1 / 1' }}
    role="img"
    aria-label="Homage to the Square"
  >
    {composition.insets.map((inset, i) => (
      <div
        key={i}
        data-square
        style={{
          position: 'absolute',
          top: `${inset.top}%`,
          left: `${inset.left}%`,
          right: `${inset.right}%`,
          bottom: `${inset.bottom}%`,
          backgroundColor: oklchCss(palette[i]),
          opacity: composition.opacities[i],
          transition: 'all 1s ease, background-color 1s ease',
        }}
      />
    ))}
  </div>
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Painting`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Painting.tsx src/components/Painting.test.tsx
git commit -m "feat: Painting component"
```

---

### Task 15: Mode context + Live/Ambient chrome

**Files:**
- Create: `src/ModeContext.tsx`, `src/components/ModePicker.tsx`, `src/components/SideRail.tsx`, `src/components/Overlay.tsx`, `src/weatherText.ts`
- Test: `src/components/ModePicker.test.tsx`, `src/weatherText.test.ts`

- [ ] **Step 1: Write ModeContext**

Create `src/ModeContext.tsx`:
```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ViewMode } from './engine/types'

interface ModeCtx { mode: ViewMode; setMode: (m: ViewMode) => void }
const Ctx = createContext<ModeCtx | null>(null)

export const ModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ViewMode>('live')
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>
}

export const useMode = (): ModeCtx => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
```

- [ ] **Step 2: Write the failing test for weatherText**

Create `src/weatherText.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { weatherCodeText } from './weatherText'

describe('weatherCodeText', () => {
  it('maps WMO codes to words', () => {
    expect(weatherCodeText(0)).toBe('clear')
    expect(weatherCodeText(3)).toBe('overcast')
    expect(weatherCodeText(45)).toBe('fog')
    expect(weatherCodeText(61)).toBe('rain')
    expect(weatherCodeText(71)).toBe('snow')
    expect(weatherCodeText(95)).toBe('thunderstorm')
    expect(weatherCodeText(999)).toBe('—')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- weatherText`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement weatherText**

Create `src/weatherText.ts`:
```ts
export const weatherCodeText = (code: number): string => {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code >= 45 && code <= 48) return 'fog'
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'rain'
  if (code >= 95) return 'thunderstorm'
  return '—'
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- weatherText`
Expected: PASS.

- [ ] **Step 6: Write the failing test for ModePicker**

Create `src/components/ModePicker.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModePicker } from './ModePicker'
import { ModeProvider, useMode } from '../ModeContext'

const Probe = () => { const { mode } = useMode(); return <span data-testid="mode">{mode}</span> }

describe('ModePicker', () => {
  it('switches the active mode', () => {
    render(<ModeProvider><ModePicker /><Probe /></ModeProvider>)
    expect(screen.getByTestId('mode').textContent).toBe('live')
    fireEvent.click(screen.getByRole('button', { name: /explore/i }))
    expect(screen.getByTestId('mode').textContent).toBe('explore')
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- ModePicker`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement ModePicker**

Create `src/components/ModePicker.tsx`:
```tsx
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
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- ModePicker`
Expected: PASS.

- [ ] **Step 10: Implement SideRail and Overlay (covered by App smoke later)**

Create `src/components/SideRail.tsx`:
```tsx
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
  <aside className="flex h-full w-64 shrink-0 flex-col gap-4 bg-[#111] p-6 text-sm text-white/85">
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
```

Create `src/components/Overlay.tsx`:
```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'

export const Overlay = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    const show = () => {
      setVisible(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setVisible(false), 2500)
    }
    window.addEventListener('pointermove', show)
    window.addEventListener('pointerdown', show)
    return () => {
      window.removeEventListener('pointermove', show)
      window.removeEventListener('pointerdown', show)
      window.clearTimeout(timer.current)
    }
  }, [])
  return (
    <div className={`pointer-events-none fixed inset-0 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="pointer-events-auto">{children}</div>
    </div>
  )
}
```

- [ ] **Step 11: Run the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/ModeContext.tsx src/components/ModePicker.tsx src/components/SideRail.tsx src/components/Overlay.tsx src/weatherText.ts src/components/ModePicker.test.tsx src/weatherText.test.ts
git commit -m "feat: mode context, mode picker, side rail, overlay, weather text"
```

---

### Task 16: Timeline + Explore components

**Files:**
- Create: `src/components/Timeline.tsx`, `src/components/Explore.tsx`
- Test: `src/components/Explore.test.tsx`

- [ ] **Step 1: Write Timeline**

Create `src/components/Timeline.tsx`:
```tsx
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
```

- [ ] **Step 2: Write the failing test for Explore**

Create `src/components/Explore.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Explore } from './Explore'

describe('Explore', () => {
  it('renders sliders, unit toggles, and six playthroughs', () => {
    render(<Explore />)
    expect(screen.getByLabelText(/time of day/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Imperial|Metric/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear Day Arc/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button').filter((b) => /Arc|Thunderstorm|Moon|Fog|Heat|Humid/.test(b.textContent ?? ''))).toHaveLength(6)
  })

  it('renders the painting with four squares', () => {
    const { container } = render(<Explore />)
    expect(container.querySelectorAll('[data-square]')).toHaveLength(4)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- Explore`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement Explore**

Create `src/components/Explore.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { Painting } from './Painting'
import { Timeline } from './Timeline'
import { buildPalette } from '../engine/palette'
import { buildComposition } from '../engine/composition'
import { deriveEnvironment } from '../engine/environment'
import { generateTitle } from '../engine/title'
import { SCENARIOS, hourToElev, timelineGradient } from '../engine/scenarios'
import type { Scenario, Weather, Sky } from '../engine/types'

interface Signals { hour: number; tempC: number; cloud: number; precipMm: number; visM: number; moon: number; humidity: number }
const INITIAL: Signals = { hour: 13, tempC: 20, cloud: 20, precipMm: 0, visM: 20000, moon: 0.5, humidity: 30 }

const fmtHour = (h: number) => {
  let hh = Math.floor(h) % 24
  let mm = Math.round((h - Math.floor(h)) * 60)
  if (mm === 60) { hh = (hh + 1) % 24; mm = 0 }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export const Explore = () => {
  const [s, setS] = useState<Signals>(INITIAL)
  const [imperial, setImperial] = useState(true)
  const [fahrenheit, setFahrenheit] = useState(true)
  const [active, setActive] = useState<Scenario | null>(null)
  const [progress, setProgress] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  const start = useRef<number | null>(null)

  // run the active scenario
  useEffect(() => {
    if (!active) return
    const step = (ts: number) => {
      if (start.current === null) start.current = ts
      const p = ((ts - start.current) % active.durationMs) / active.durationMs
      setProgress(p)
      setS(active.at(p))
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current); start.current = null }
  }, [active])

  const set = (patch: Partial<Signals>) => { setActive(null); setS((prev) => ({ ...prev, ...patch })) }

  const elev = hourToElev(s.hour)
  const weather: Weather = {
    temperatureC: s.tempC, weatherCode: 0, cloudCover: s.cloud, precipitation: s.precipMm,
    visibilityM: s.visM, relativeHumidity: s.humidity, isDay: elev > 0,
  }
  const sky: Sky = { sunElevationDeg: elev, moonIllumination: s.moon }
  const env = deriveEnvironment(weather, sky)
  const palette = buildPalette(env)
  const composition = buildComposition(s.humidity, elev)
  const title = generateTitle(env, new Date(2026, 0, 1, Math.floor(s.hour)))

  const tempDisplay = fahrenheit ? Math.round(s.tempC * 9 / 5 + 32) : Math.round(s.tempC)
  const visDisplay = imperial ? (s.visM / 1609.34).toFixed(1) + ' mi' : (s.visM / 1000).toFixed(1) + ' km'
  const precipDisplay = imperial ? (s.precipMm / 25.4).toFixed(2) + ' in' : s.precipMm.toFixed(1) + ' mm'

  return (
    <div className="flex flex-wrap items-start gap-8 p-8">
      <div>
        <div className="flex h-[380px] w-[380px] items-center justify-center rounded-md bg-[#0d0d0d]">
          <div className="h-[360px] w-[360px]"><Painting composition={composition} palette={palette} /></div>
        </div>
        <div className="mt-4 w-[380px] text-center italic text-white/85">{title}</div>
        {active && (
          <div className="mt-4 flex justify-center">
            <Timeline gradient={timelineGradient(active)} progress={progress} name={active.name} label={active.id === 'clearDay' ? fmtHour(s.hour) : `${Math.round(progress * 100)}%`} />
          </div>
        )}
        <div className="mt-5 grid w-[380px] grid-cols-2 gap-2">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => { start.current = null; setActive(active?.id === sc.id ? null : sc) }}
              className={`rounded-lg border p-2 text-left text-xs ${active?.id === sc.id ? 'border-transparent bg-amber-500 text-black' : 'border-white/20 bg-white/5 text-white/85 hover:border-amber-500'}`}
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-[340px] flex-1 text-white/85">
        <div className="mb-5 flex gap-2">
          <button onClick={() => setFahrenheit((v) => !v)} className="rounded-full border border-white/30 px-3 py-1 text-xs">Temperature: {fahrenheit ? '°F' : '°C'}</button>
          <button onClick={() => setImperial((v) => !v)} className="rounded-full border border-white/30 px-3 py-1 text-xs">Units: {imperial ? 'Imperial' : 'Metric'}</button>
        </div>
        <Slider label="Time of day" value={fmtHour(s.hour) + ' · ' + Math.round(elev) + '°'} min={0} max={24} step={0.25} v={s.hour} onChange={(hour) => set({ hour })} />
        <Slider label="Temperature" value={tempDisplay + (fahrenheit ? '°F' : '°C')} min={-18} max={43} step={0.5} v={s.tempC} onChange={(tempC) => set({ tempC })} />
        <Slider label="Cloud cover" value={s.cloud + '%'} min={0} max={100} step={1} v={s.cloud} onChange={(cloud) => set({ cloud })} />
        <Slider label="Precipitation" value={precipDisplay} min={0} max={10} step={0.1} v={s.precipMm} onChange={(precipMm) => set({ precipMm })} />
        <Slider label="Visibility / fog" value={visDisplay} min={50} max={20000} step={50} v={s.visM} onChange={(visM) => set({ visM })} />
        <Slider label="Moon illumination" value={Math.round(s.moon * 100) + '%'} min={0} max={1} step={0.01} v={s.moon} onChange={(moon) => set({ moon })} />
        <Slider label="Humidity → squares (3↔4)" value={s.humidity + '%'} min={0} max={100} step={1} v={s.humidity} onChange={(humidity) => set({ humidity })} />
      </div>
    </div>
  )
}

interface SliderProps { label: string; value: string; min: number; max: number; step: number; v: number; onChange: (n: number) => void }
const Slider = ({ label, value, min, max, step, v, onChange }: SliderProps) => (
  <div className="mb-4">
    <label className="mb-1 flex justify-between text-xs">
      <span>{label}</span><span className="tabular-nums opacity-70">{value}</span>
    </label>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-amber-500" />
  </div>
)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- Explore`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Timeline.tsx src/components/Explore.tsx src/components/Explore.test.tsx
git commit -m "feat: Timeline + Explore mode (ported from prototype)"
```

---

### Task 17: App shell — wire pipeline + modes

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`, `index.html`

- [ ] **Step 1: Wire App.tsx**

Replace `src/App.tsx`:
```tsx
import { useState } from 'react'
import { ModeProvider, useMode } from './ModeContext'
import { useClock } from './hooks/useClock'
import { useGeolocation } from './hooks/useGeolocation'
import { useWeather } from './hooks/useWeather'
import { useSky } from './hooks/useSky'
import { deriveEnvironment } from './engine/environment'
import { buildPalette } from './engine/palette'
import { buildComposition } from './engine/composition'
import { generateTitle } from './engine/title'
import { weatherCodeText } from './weatherText'
import { Painting } from './components/Painting'
import { SideRail } from './components/SideRail'
import { Overlay } from './components/Overlay'
import { ModePicker } from './components/ModePicker'
import { Explore } from './components/Explore'
import type { Environment } from './engine/types'

const NEUTRAL: Environment = { hueDeg: 220, chroma: 0.25, lightness: 0.4, warmShift: 0, fogContrast: 1, moonLift: 0 }

const Stage = () => {
  const { mode } = useMode()
  const now = useClock(60000)
  const { place, error, setCity } = useGeolocation()
  const lat = place?.lat ?? null
  const lon = place?.lon ?? null
  const { weather, stale } = useWeather(lat, lon)
  const sky = useSky(now, lat, lon)

  const env = weather && sky ? deriveEnvironment(weather, sky) : NEUTRAL
  const palette = buildPalette(env)
  const composition = buildComposition(weather?.relativeHumidity ?? 50, sky?.sunElevationDeg ?? 30)
  const title = generateTitle(env, now)
  const hour = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const conditionText = weather ? weatherCodeText(weather.weatherCode) : 'locating…'

  if (mode === 'explore') return <div className="min-h-screen w-screen overflow-auto text-white"><Explore /></div>

  if (mode === 'ambient') {
    return (
      <div className="h-screen w-screen">
        <div className="flex h-full w-full items-center justify-center bg-[#0d0d0d]">
          <Painting composition={composition} palette={palette} />
        </div>
        <Overlay>
          <div className="fixed right-6 top-6"><ModePicker /></div>
          <div className="fixed bottom-6 left-6 text-sm italic text-white/80">{title}</div>
        </Overlay>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen">
      <SideRail
        placeName={place?.name ?? error ?? 'Locating…'}
        temperatureC={weather?.temperatureC ?? 0}
        conditionText={conditionText}
        hour={hour}
        title={title}
        stale={stale}
      />
      <div className="flex flex-1 items-center justify-center bg-[#0d0d0d]">
        <Painting composition={composition} palette={palette} />
      </div>
      <CitySearch onSubmit={setCity} />
    </div>
  )
}

const CitySearch = ({ onSubmit }: { onSubmit: (name: string) => void }) => {
  const [value, setValue] = useState('')
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()) }}
      className="fixed bottom-4 right-4"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Set city…"
        className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40"
      />
    </form>
  )
}

const App = () => (
  <ModeProvider><Stage /></ModeProvider>
)

export default App
```

- [ ] **Step 2: Clean up main.tsx**

Replace `src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
```

Remove default leftovers:
```bash
rm -f src/App.css src/assets/react.svg
```

- [ ] **Step 3: Set the document title**

In `index.html`, set:
```html
<title>Homage to the Square</title>
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Typecheck + build**

Run: `npm run build`
Expected: `tsc -b` passes and Vite builds with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire pipeline, modes, and app shell"
```

---

### Task 18: Manual verification + embeddable Explore route

**Files:**
- Modify: `src/App.tsx` (read `?mode=` query param for embedding)

- [ ] **Step 1: Honor a `?mode=explore` query param for iframe embeds**

In `src/App.tsx`, change the `ModeProvider` initial mode by reading the URL. Replace the `App` component:
```tsx
const App = () => {
  const params = new URLSearchParams(window.location.search)
  const initial = params.get('mode') === 'explore' ? 'explore' : undefined
  return (
    <ModeProvider initialMode={initial}>
      <Stage />
    </ModeProvider>
  )
}
```

And update `ModeProvider` in `src/ModeContext.tsx` to accept an optional initial mode:
```tsx
export const ModeProvider = ({ children, initialMode }: { children: ReactNode; initialMode?: ViewMode }) => {
  const [mode, setMode] = useState<ViewMode>(initialMode ?? 'live')
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>
}
```
This lets the blog post embed `<iframe src=".../?mode=explore">` and land directly on the widget.

- [ ] **Step 2: Run the full suite + build**

Run: `npm test && npm run build`
Expected: PASS and a clean build.

- [ ] **Step 3: Run the dev server and verify behavior**

Run: `npm run dev`

Confirm (note results):
- On load, the browser prompts for location; allowing renders a painting; denying falls back to IP location.
- The side rail shows place, temperature + condition, the hour, and an italic generated title.
- **Ambient** removes the rail; the painting fills the screen; pointer movement fades chrome in, then out.
- **Explore** shows the dashboard; sliders change the painting; the unit toggles flip °F/°C and Imperial/Metric; each playthrough loops and shows the timeline with the color band + playhead.
- Visiting `/?mode=explore` lands directly on the Explore widget.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: ?mode=explore for embeddable Explore widget"
```

- [ ] **Step 5: Run the blog-draft skill**

Per Sam's workflow, this is a substantial build commit on a personal project — invoke the `blog-draft` skill to update `2026-05-29-weather-aware-albers.mdx` (the draft already exists; extend it, fill the TODOs about the live build). Do not push the portfolio repo.

---

## Notes for the implementer

- **Engine values are sacred:** every constant in `mappers.ts`, `palette.ts`, `composition.ts`, and `scenarios.ts` is copied from `prototype/dashboard.html`. If you change one, change it in both places and re-tune visually.
- **OKLCH transitions:** color + inset tweening is pure CSS (`transition: all 1s ease`). No JS animation loop except the Explore playthroughs (requestAnimationFrame driving scenario `p`).
- **No backend, no secrets:** Open-Meteo (weather + geocoding) and ipapi.co (IP fallback) need no keys; all calls are client-side `fetch`.
- **Deploy:** after this plan, `npm run build` produces a static bundle. Use the `deploy-to-gutentag` skill to host it under the dev domain; `base: './'` keeps assets working under any path and inside the blog iframe.
