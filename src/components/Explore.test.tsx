import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Explore } from './Explore'
import { UnitsProvider } from '../UnitsContext'

const renderExplore = () => render(<UnitsProvider><Explore /></UnitsProvider>)

describe('Explore', () => {
  it('renders sliders, unit toggles, and six playthroughs', () => {
    renderExplore()
    expect(screen.getByLabelText(/time of day/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Imperial|Metric/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear Day Arc/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button').filter((b) => /Arc|Thunderstorm|Moon|Fog|Heat|Humid/.test(b.textContent ?? ''))).toHaveLength(6)
  })

  it('renders the painting with four squares', () => {
    const { container } = renderExplore()
    expect(container.querySelectorAll('[data-square]')).toHaveLength(4)
  })
})
