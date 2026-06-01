import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ClimateRanges } from '../engine/types'
import { fetchClimateRange } from '../data/climate'
import { useClimateRange } from './useClimateRange'

vi.mock('../data/climate', () => ({ fetchClimateRange: vi.fn() }))
const mockFetch = vi.mocked(fetchClimateRange)

const sample: ClimateRanges = {
  annual: { coldC: 3, hotC: 30 },
  monthly: Array.from({ length: 12 }, () => ({ coldC: 3, hotC: 30 })),
}
const KEY = 'clim:v1:34.42,-119.70'

beforeEach(() => {
  localStorage.clear()
  mockFetch.mockReset()
})
afterEach(() => vi.restoreAllMocks())

describe('useClimateRange', () => {
  it('fetches on a cache miss and caches the result', async () => {
    mockFetch.mockResolvedValue(sample)
    const { result } = renderHook(() => useClimateRange(34.42, -119.7))
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toEqual(sample))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(sample)
  })

  it('uses the cached value without fetching', async () => {
    localStorage.setItem(KEY, JSON.stringify(sample))
    const { result } = renderHook(() => useClimateRange(34.42, -119.7))
    await waitFor(() => expect(result.current).toEqual(sample))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('stays null and does not cache when the fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useClimateRange(34.42, -119.7))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    await Promise.resolve()
    expect(result.current).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('still fetches when localStorage reads throw', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    mockFetch.mockResolvedValue(sample)
    const { result } = renderHook(() => useClimateRange(34.42, -119.7))
    await waitFor(() => expect(result.current).toEqual(sample))
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
