import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CitySearch } from './CitySearch'
import * as location from '../data/location'

afterEach(() => vi.restoreAllMocks())

describe('CitySearch', () => {
  it('searches as you type and calls onSelect with the chosen place', async () => {
    vi.spyOn(location, 'searchCities').mockResolvedValue([
      { lat: 52.52, lon: 13.41, name: 'Berlin, Germany' },
    ])
    const onSelect = vi.fn()
    render(<CitySearch onSelect={onSelect} />)

    fireEvent.change(screen.getByLabelText(/search city/i), { target: { value: 'Berlin' } })
    const result = await screen.findByText('Berlin, Germany')
    fireEvent.click(result)

    expect(onSelect).toHaveBeenCalledWith({ lat: 52.52, lon: 13.41, name: 'Berlin, Germany' })
  })

  it('does not search for queries shorter than two characters', () => {
    const spy = vi.spyOn(location, 'searchCities').mockResolvedValue([])
    render(<CitySearch onSelect={() => {}} />)
    fireEvent.change(screen.getByLabelText(/search city/i), { target: { value: 'B' } })
    expect(spy).not.toHaveBeenCalled()
  })
})
