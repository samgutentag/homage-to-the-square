import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReveal } from './useReveal'

afterEach(() => vi.useRealTimers())

describe('useReveal', () => {
  it('starts hidden and reveals once ready', () => {
    const { result, rerender } = renderHook(({ ready }) => useReveal(ready), { initialProps: { ready: false } })
    expect(result.current).toBe(false)
    rerender({ ready: true })
    expect(result.current).toBe(true)
  })

  it('stays revealed even if ready flips back to false', () => {
    const { result, rerender } = renderHook(({ ready }) => useReveal(ready), { initialProps: { ready: true } })
    expect(result.current).toBe(true)
    rerender({ ready: false })
    expect(result.current).toBe(true)
  })

  it('reveals after the fallback timeout even if never ready', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useReveal(false, 2500))
    expect(result.current).toBe(false)
    act(() => { vi.advanceTimersByTime(2500) })
    expect(result.current).toBe(true)
  })
})
