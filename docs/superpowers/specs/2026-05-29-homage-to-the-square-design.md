# Homage to the Square — design spec

**Date:** 2026-05-29
**Status:** Approved (design locked via interactive prototype)

## What it is

A client-side web app that renders a continuously-evolving Josef Albers "Homage to the Square" painting driven by the viewer's location, live weather, and the position of the sun. Inspired by [rothko.joonas.wtf](https://rothko.joonas.wtf/), but where the Rothko site picks among photographed paintings, this one *generates* the painting procedurally — Albers' format is geometrically exact (flat nested squares on a shared vertical axis, pushed toward the bottom), so it can be drawn faithfully from a palette in code. The painting drifts minute to minute as the day and weather move.

A working prototype of the full mapping + the Explore mode lives at `prototype/dashboard.html` (standalone, no build step). It is the source of truth for the engine math and is preserved for the hosted site and the portfolio blog post.

## Signal → feature map (locked)

All color math is done in **OKLCH** (perceptually uniform — keeps tweens and value steps even) and emitted as native CSS `oklch()` strings; the browser interpolates transitions. The painting is built from a palette (per-square colors) plus a composition (per-square insets).

### Color (driven by weather)
| Signal | Source | Drives |
|---|---|---|
| Temperature | Open-Meteo `temperature_2m` | **Base hue** — cold → cool (~250°), hot → warm (~50°) |
| Sky grayness | `cloud_cover` + `precipitation` | **Chroma** (clear → vivid, overcast → gray) **and daytime brightness** (clear → light, storm → dark) |
| Visibility / fog | `visibility` | **Contrast between squares** — fog compresses the value steps so adjacent squares nearly merge (the most Albers-authentic effect) |
| Sun near horizon | sun elevation | **Golden-hour warm hue shift** (a hue effect, not brightness) |
| Moon phase | moon illumination | **Innermost-square lift, night only** — brighter moon raises the center square's value/chroma |

### Composition + time (driven by the sun)
| Signal | Source | Drives |
|---|---|---|
| Sun elevation | `time + place → elevation` (suncalc) | **Vertical position of the stack** (high sun lifts toward center, low sun pushes down) **and the day↔night brightness gate** (night is dark, which is what makes the moon lift read) |
| Humidity | `relative_humidity_2m` | **Square count, 3 ↔ 4** — the one discrete lever; crossfades over a transition band, the innermost square fading as the spacing opens |

**Key decision:** the sun's *visible* job is **position**, not brightness. Brightness comes from the weather, with the sun only gating day vs night. This was chosen deliberately over a "sun also dims through the day" model.

**Composition stays close to the source.** Geometry is defined by two authentic Albers templates — a pushed-down 4-square and a pushed-down 3-square (top margin wide, bottom narrow, true squares: `top+bottom = left+right`). Humidity linearly interpolates between the two; the sun adds a bounded vertical offset. Every in-between frame is a blend of real Albers spacings — no invented geometry.

**Signals considered and dropped:** season, wind speed, pressure.

## Motion model

Everything animates slowly and continuously — no jumps. Color and inset values tween via CSS transitions (~1s in the prototype; longer in production). The discrete 3↔4 change is handled by interpolating between the two templates plus fading the innermost square, so even the count change is smooth. In production:
- **Sun-driven** values recompute every minute (elevation is continuous).
- **Weather-driven** values re-poll every ~12 minutes.

## View modes

A mode picker switches the chrome treatment:
- **Live** (default) — side rail: location, weather readout, local hour, generated title. Painting fills the rest.
- **Ambient** — pure fullscreen; painting bleeds edge to edge; chrome auto-hides, reappearing on pointer move/tap.
- **Explore** — the interactive dashboard (the prototype): sliders for every signal, two unit toggles (temperature °F/°C; Imperial/Metric for precipitation + visibility, **imperial by default**), and six **playthroughs**.
- *(Time-lapse from the original spec is folded into Explore's playthroughs.)*

### Playthroughs (Explore mode)
Six scripted scenarios, each a pure function of loop-progress `p ∈ [0,1]`, each spotlighting a different signal, with a read-only **timeline** (a color band sampled from the engine across the loop + a moving playhead):
1. **Clear Day Arc** — sun → squares rise and fall through a day
2. **Afternoon Thunderstorm** — clouds build, rain peaks, desaturates + darkens, clears
3. **Full Moon Night** — held at night, moon waxes, center square glows
4. **Rolling Fog** — visibility drops, squares merge then separate
5. **Heat Wave** — hot, vivid, warm hue
6. **Humid Drift (3↔4)** — composition crossfade

## Architecture

Stack: **React + TypeScript + Vite + Tailwind**. No backend. Weather + geocoding via **Open-Meteo** (free, no API key); IP fallback via ipapi.co; sun/moon via **suncalc**.

The center of gravity is a **pure pipeline** (`signals → environment → palette + composition`) with no React or I/O, fully unit-testable. The prototype's JS is the reference implementation.

### Units (`src/engine/`)
- `types.ts` — `Weather`, `Sky`, `Environment`, `OklchColor`, `Inset`, `LayoutTemplate`, `ViewMode`, `Scenario`.
- `color.ts` — `oklchCss`, `clamp`, `clamp01`, `rotateHueToward`, `lerp`.
- `mappers.ts` — `tempToHue`, `skyToChroma`, `skyDayLightness`, `lightnessFor` (with day/night gate), `sunToWarmShift`, `visibilityToFogContrast`, `moonToLift`, `sunToOffset`.
- `environment.ts` — `deriveEnvironment(weather, sky)`.
- `palette.ts` — `buildPalette(env, format)` (Albers color logic: monotonic value steps, fog compression, moon lift).
- `composition.ts` — `buildComposition(humidity, sunElevation)` blends `T4`/`T3` templates + applies the sun offset.
- `title.ts` — `generateTitle(env, date)`.
- `sun.ts` — `elevationFor(date, lat, lon)` + `moonIlluminationFor(date)` (suncalc). **The swappable `time+place → elevation` boundary**; the Explore demo substitutes a simple sine `hourToElev`.
- `scenarios.ts` — the six playthroughs as `(p) => signal values`, plus the timeline-gradient sampler.

### Data (`src/data/`)
- `weather.ts` — `fetchWeather(lat, lon)` (Open-Meteo, includes `relative_humidity_2m`).
- `location.ts` — `geocodeCity`, `ipLocate`.

### Hooks (`src/hooks/`)
- `useClock` (minute tick), `useGeolocation` (browser → IP → manual city), `useWeather` (poll ~12 min, last-good retention), `useSky` (recompute elevation/moon per tick).

### Components (`src/components/`)
- `Painting` — nested square divs from composition + palette, CSS-tweened.
- `SideRail`, `ModePicker`, `Overlay` (ambient auto-hide), `Explore` (sliders + toggles + playthroughs + `Timeline`).

## Hosting + embedding (requirement)

- Builds to a static bundle (Vite). Deployable to GitHub Pages under the dev domain via the `deploy-to-gutentag` flow (`<name>.gutentag.world`).
- The **Explore** view must work as a standalone, **iframe-embeddable** widget for the portfolio blog post (no external state, no required permissions — geolocation degrades to a default).

## Error handling

- **Geolocation denied:** IP fallback → manual city search → sensible default with a visible note. Never hard-fail.
- **Weather fetch failure:** keep last-good, retry with backoff, subtle "stale" indicator. First load shows a neutral mid-value painting + "locating…".
- **Sun/moon:** pure math, always available offline — the painting runs on time-of-day alone if weather is unreachable.

## Testing

- **Engine (primary):** unit-test each mapper (monotonicity, clamping, day/night gate, fog compression, moon night-only); `buildPalette` invariants (count, monotonic value steps, fog reduces spread, moon lifts innermost); `buildComposition` (count blend, sun offset bounded, insets valid); `generateTitle` snapshots; scenarios are pure and loop-continuous.
- **Components:** render/smoke tests; mode switching; hooks mocked.

## Out of scope (YAGNI)

Backend, accounts, saving/sharing, dropped signals (season/wind/pressure), real painting *images*, native mobile.
