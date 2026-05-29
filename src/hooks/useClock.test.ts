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
