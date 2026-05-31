import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlace } from './usePlace'

describe('usePlace', () => {
  it('defaults to Santa Barbara', () => {
    const { result } = renderHook(() => usePlace())
    expect(result.current.place.name).toMatch(/santa barbara/i)
  })

  it('selectPlace updates the current place', () => {
    const { result } = renderHook(() => usePlace())
    act(() => result.current.selectPlace({ lat: 52.52, lon: 13.41, name: 'Berlin, Germany' }))
    expect(result.current.place.name).toBe('Berlin, Germany')
  })
})
