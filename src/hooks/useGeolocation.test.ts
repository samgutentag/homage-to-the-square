import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGeolocation } from './useGeolocation'

afterEach(() => vi.restoreAllMocks())

describe('useGeolocation', () => {
  it('resolves browser coordinates into a place', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) =>
          ok({ coords: { latitude: 37.8, longitude: -122.27 } }),
      },
    })
    const { result } = renderHook(() => useGeolocation())
    await waitFor(() => expect(result.current.place).not.toBeNull())
    expect(result.current.place?.lat).toBeCloseTo(37.8, 5)
  })
})
