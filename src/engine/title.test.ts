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
