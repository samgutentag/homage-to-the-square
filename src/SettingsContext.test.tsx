import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SettingsProvider, useSettings, formatTemp, formatDegree } from './SettingsContext'

const wrapper = ({ children }: { children: ReactNode }) => <SettingsProvider>{children}</SettingsProvider>

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('SettingsContext', () => {
  it('starts with sensible defaults', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.fahrenheit).toBe(true)
    expect(result.current.imperial).toBe(true)
    expect(result.current.lightBg).toBe(false)
    expect(result.current.scalingMode).toBe('annual')
  })

  it('updates each setting through its setter', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => result.current.setFahrenheit(false))
    act(() => result.current.setLightBg(true))
    act(() => result.current.setScalingMode('daily'))
    expect(result.current.fahrenheit).toBe(false)
    expect(result.current.lightBg).toBe(true)
    expect(result.current.scalingMode).toBe('daily')
  })

  it('persists changes and rehydrates them in a fresh provider', () => {
    const first = renderHook(() => useSettings(), { wrapper })
    act(() => first.result.current.setScalingMode('monthly'))
    act(() => first.result.current.setFahrenheit(false))
    first.unmount()

    const second = renderHook(() => useSettings(), { wrapper })
    expect(second.result.current.scalingMode).toBe('monthly')
    expect(second.result.current.fahrenheit).toBe(false)
  })

  it('falls back to defaults when localStorage reads throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.scalingMode).toBe('annual')
    expect(result.current.fahrenheit).toBe(true)
  })
})

describe('format helpers', () => {
  it('formatTemp renders the chosen unit', () => {
    expect(formatTemp(20, true)).toBe('68°F')
    expect(formatTemp(20, false)).toBe('20°C')
  })
  it('formatDegree drops the unit suffix', () => {
    expect(formatDegree(20, true)).toBe('68°')
    expect(formatDegree(20, false)).toBe('20°')
  })
})
