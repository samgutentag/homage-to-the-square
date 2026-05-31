import type { Environment } from './types'

export const warmthWord = (hueDeg: number): string =>
  hueDeg < 110 ? 'Warm' : hueDeg < 190 ? 'Temperate' : 'Cool'

export const clarityWord = (chroma: number): string =>
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
