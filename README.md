# Homage to the Square

A weather- and location-aware generative painting, after Josef Albers' *Homage to the Square*. The composition is drawn procedurally and drifts continuously with the sun, the sky, and the season of the day — color and geometry both responding to real conditions.

Inspired by [rothko.joonas.wtf](https://rothko.joonas.wtf/), but procedural rather than photographic: Albers' nested-square format is geometrically exact, so the painting is generated from a palette in code instead of served as an image.

## How the mapping works

- **Temperature → hue** (cold → cool, hot → warm)
- **Sky (cloud + rain) → saturation + brightness** (clear → vivid/light, storm → gray/dark)
- **Sun elevation → the squares' vertical position** + the day/night gate
- **Visibility/fog → contrast between the squares** (fog merges them)
- **Moon phase → a glow on the center square at night**
- **Humidity → 3 ↔ 4 squares**, crossfading between two authentic Albers templates — humid air adds the fourth square, dry air drops to three

All color is computed in OKLCH for even, perceptually-uniform transitions.

The temperature→hue scale stretches across a **local climate range** so mild places still show the full spectrum. A settings dialog (⚙) picks the window — **Daily** (today's forecast high/low), **Monthly**, or **Annual** — alongside °F/°C, Imperial/Metric, and the dark/light backdrop. Monthly and annual ranges come from the Open-Meteo historical archive (one cached call per city); daily reuses the current forecast.

## Prototype

`prototype/dashboard.html` is a standalone, no-build interactive demo of the full mapping — sliders for every signal, °F/°C and Imperial/Metric toggles, and six scripted "playthroughs" (Clear Day Arc, Afternoon Thunderstorm, Full Moon Night, Rolling Fog, Heat Wave, Humid Drift) with a color-band timeline. Open it directly in a browser.

This same Explore view ships in the app and is embeddable in the portfolio write-up.

## Design

See [`docs/superpowers/specs/`](docs/superpowers/specs/) for the full design spec.

## Stack

React + TypeScript + Vite + Tailwind. Weather, geocoding, and historical climate via [Open-Meteo](https://open-meteo.com/) (no API key); sun/moon via [suncalc](https://github.com/mourner/suncalc). Fully client-side; builds to a static bundle.
