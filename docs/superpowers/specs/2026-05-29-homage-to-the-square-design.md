# Homage to the Square — design spec

**Date:** 2026-05-29
**Status:** Approved for planning

## What it is

A web app that renders a continuously-evolving Josef Albers "Homage to the Square" painting driven by the viewer's location, live weather, and the position of the sun. Inspired by [rothko.joonas.wtf](https://rothko.joonas.wtf/), but where the Rothko site picks among photographed paintings, this one *generates* the painting procedurally — because Albers' format is geometrically exact (3–4 flat nested squares on a shared vertical axis, pushed toward the bottom edge), it can be drawn faithfully from a palette in code. The result is a living piece that drifts minute to minute as the day and weather move.

## Core decisions (from brainstorming)

- **Rendering: procedural**, not photographed. Nested squares drawn in the browser, no painting image files.
- **Layouts: traced from real Albers works.** A small catalog of authentic nesting proportions (3-square and 4-square formats) that Sam will source from real paintings. Geometry is authentic; color is live.
- **Color mapping: approach C — weather sets the parameters, Albers' color logic constrains them.** Weather/sun drive hue/value/chroma *targets*; the palette generator enforces Albers-like relationships between squares so output always behaves like an Albers, even when the specific colors are novel and continuous.
- **Signals in play:** temperature, sky condition, time-of-day (sun elevation), visibility/fog, moon phase. Cloud cover and precipitation are folded into a single "sky" model rather than separate dials. *Season was considered and dropped.*
- **Living, not static:** the painting recomputes every minute (sun elevation is continuous) and tweens smoothly; weather re-polls every ~12 minutes.
- **Three view modes** behind a picker: **Live** (side rail), **Ambient** (pure fullscreen), **Time-lapse** (side rail + scrub slider).

## Signal → color/composition mapping

All color math happens in **OKLCH** (perceptually uniform — keeps tweens and value steps even). Each signal is first normalized to a 0–1 (or angular) value, then mapped to a color dimension:

| Signal | Source | Drives | Behavior |
|---|---|---|---|
| Temperature | Open-Meteo `temperature_2m` | Base **hue** | Cold → cool hues (blue/teal), hot → warm hues (ochre/red). Mapped across a perceptual hue arc, clamped to a tasteful range. |
| Sky condition + cloud + precip | `weather_code`, `cloud_cover`, `precipitation` | **Chroma** (saturation) + value damping | Clear → high chroma; overcast/rain → desaturated, slightly darker. One combined "grayness/intensity" scalar. |
| Time of day | Sun elevation (computed) | Overall **lightness** + golden-hour warm shift | Continuous −90°→+90° sun-elevation curve → value baseline; near-horizon angles add a warm hue nudge (dawn/dusk). Night = deep low values. |
| Visibility / fog | `visibility` | **Contrast between squares** | Low visibility compresses the value steps so adjacent squares nearly merge — the most Albers-authentic effect (his subject was color adjacency). |
| Moon phase | Computed (illumination fraction) | Innermost-square lift, **night only** | After dark, a brighter moon raises the value/chroma of the centermost square — a small reward for looking at night. |

**Why these axes work together:** temperature → hue, condition → chroma, time-of-day → lightness are nearly orthogonal in OKLCH, so signals layer without fighting. Fog acts on the *relationship* between squares rather than on the palette itself; moon is a bounded night-only flourish.

## Architecture

Stack: **React + TypeScript + Vite + Tailwind** (Sam's defaults). No backend — all client-side. Weather and geocoding via **Open-Meteo** (free, no API key). Sun and moon via **suncalc**.

The system splits into small, independently-testable units. The center of gravity is a **pure pipeline** (signals → environment → palette + layout) that has no React or I/O in it and is fully unit-testable; everything else is acquisition (hooks) or presentation (components).

### 1. Signal acquisition (React hooks, the only I/O)
- `useGeolocation()` — browser Geolocation API → `{ lat, lon }`. On denial/failure, falls back to Open-Meteo IP-based lookup, then to a manual city search (Open-Meteo geocoding API). Exposes the resolved place name for display.
- `useWeather(lat, lon)` — fetches Open-Meteo current weather (`temperature_2m`, `weather_code`, `cloud_cover`, `precipitation`, `visibility`, `is_day`). Polls every ~12 min with exponential backoff on failure; retains last-good data.
- `useClock()` — a one-minute tick (and a faster virtual tick in Time-lapse mode). Drives recomputation of sun-dependent values.
- `useSky(lat, lon, time)` — wraps suncalc: sun elevation + moon illumination for the given instant.

### 2. Mapping engine (pure, no React) — `src/engine/`
- `deriveEnvironment(weather, sky)` → a normalized `Environment` struct: `{ tempNorm, grayness, lightness, warmShift, fogContrast, moonLift }`. One pure function per signal, composed here.
- `buildPalette(env, format)` → `Color[]` (one OKLCH color per square). Encodes **Albers' color logic**: monotonic value steps between squares, bounded chroma progression, hue cohesion with controlled spread. `fogContrast` compresses the value deltas; `moonLift` adjusts the innermost color at night. This module is where "always looks like an Albers" lives.
- `generateTitle(env, place, time)` → e.g. *"Homage to the Square: Warm Haze, Late Afternoon"*. Deterministic from inputs.

### 3. Layout catalog — `src/layouts/`
- `layouts.json` — an array of templates traced from real Albers works. Each template: `{ id, source, format: 3|4, insets: [{top,left,right,bottom}, …] }` (per-square inset percentages). Sam sources these.
- `pickLayout(seed)` — chooses a template deterministically from a stable seed (date + location) so the composition stays put through the day and only the color breathes. No flicker.

### 4. Painting renderer — `src/components/Painting.tsx`
- Renders the square as nested absolutely-positioned `<div>`s using the active layout's insets. Colors applied as CSS custom properties in `oklch()`; a `transition` on the color properties produces the smooth multi-second tween between recomputes. Letterboxed to a true square inside the viewport (centered on near-black) except in Ambient mode.

### 5. App shell + modes — `src/App.tsx`, `src/components/`
- `ModeProvider` holds the current view mode (`live` | `ambient` | `timelapse`).
- **Live** → `SideRail` visible: location, weather readout, local hour, mode picker. Painting fills the remainder.
- **Ambient** → rail collapses; painting bleeds edge to edge; chrome (a translucent overlay with the same info + picker) appears on mouse-move/tap and auto-hides after a few seconds of stillness.
- **Time-lapse** → side rail plus a `ScrubSlider` that advances a virtual clock through the coming/replayed day; the engine recomputes against the virtual time so the whole arc plays in ~10s.

### Data flow

```
[useGeolocation] ─┐
[useWeather] ─────┼─→ deriveEnvironment() ─→ buildPalette() ─┐
[useSky] ─────────┘                                          ├─→ <Painting/> (CSS oklch tween)
[useClock tick] ──→ (re-runs the pipeline each minute)        │
[layouts.json] ─→ pickLayout(seed) ─────────────────────────┘
                       │
                       └─→ generateTitle() ─→ SideRail / overlay
```

## Error handling

- **Geolocation denied/unavailable:** fall back to IP lookup; if that fails, prompt for a city (geocoding search). Never hard-fail — degrade to a sensible default location with a visible note.
- **Weather fetch failure:** keep last-good data, retry with backoff, show a subtle "stale" indicator in the rail. First-load-with-no-data shows a neutral mid-value palette and a quiet "locating…" state (mirrors the reference site).
- **suncalc / time:** always available offline (pure math), so sun/moon never block rendering — the painting can run on time-of-day alone if weather is unreachable.
- **Bad/empty layout catalog:** ship one built-in fallback template so the app renders before Sam adds traced layouts.

## Testing

- **Engine (primary):** unit-test each pure mapping function — temperature→hue monotonic and clamped; condition→chroma; sun-elevation→lightness across a day; fog→value-step compression; moon lift bounded and night-only. Test `buildPalette` invariants: correct color count per format, monotonic value steps, chroma within bounds, fog actually reduces inter-square contrast.
- **Title generator:** deterministic snapshot tests across representative environments.
- **`pickLayout`:** same seed → same template (stability), valid insets.
- **Components:** smoke/render tests for `Painting` (renders N squares with expected CSS vars) and mode switching. Acquisition hooks mocked.

## Out of scope (YAGNI)

- Backend, accounts, saving/sharing paintings.
- Wind→composition and other unselected signals.
- Real painting *images* (procedural only).
- Mobile-native app (responsive web is enough).

## Open items for Sam

- Source the real-Albers layout templates (proportions for a few 3- and 4-square works) to populate `layouts.json`. The app ships with one fallback so this isn't a blocker.
