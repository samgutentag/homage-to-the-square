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
