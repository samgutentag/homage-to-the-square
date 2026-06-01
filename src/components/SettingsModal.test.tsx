import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SettingsProvider } from '../SettingsContext'
import * as location from '../data/location'
import { SettingsModal } from './SettingsModal'

const renderModal = () => {
  const onClose = vi.fn()
  const onLearnMode = vi.fn()
  const onSelectPlace = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) => <SettingsProvider>{children}</SettingsProvider>
  render(<SettingsModal onClose={onClose} onLearnMode={onLearnMode} onSelectPlace={onSelectPlace} />, { wrapper })
  return { onClose, onLearnMode, onSelectPlace }
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('SettingsModal', () => {
  it('renders all four preference groups', () => {
    renderModal()
    expect(screen.getByText('Temp')).toBeInTheDocument()
    expect(screen.getByText('Units')).toBeInTheDocument()
    expect(screen.getByText('Backdrop')).toBeInTheDocument()
    expect(screen.getByText('Color by')).toBeInTheDocument()
  })

  it('reflects defaults as the pressed segment', () => {
    renderModal()
    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches the active segment when clicked', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: '°C' }))
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Daily' }))
    expect(screen.getByRole('button', { name: 'Daily' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('closes on Escape', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on backdrop click but not on panel click', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByTestId('settings-panel'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('settings-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('invokes the learn-mode callback from the footer link', () => {
    const { onLearnMode } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /learn mode/i }))
    expect(onLearnMode).toHaveBeenCalledTimes(1)
  })

  it('renders a city search field', () => {
    renderModal()
    expect(screen.getByLabelText(/search city/i)).toBeInTheDocument()
  })

  it('forwards a chosen city to onSelectPlace', async () => {
    vi.spyOn(location, 'searchCities').mockResolvedValue([{ lat: 52.52, lon: 13.41, name: 'Berlin, Germany' }])
    const { onSelectPlace } = renderModal()
    fireEvent.change(screen.getByLabelText(/search city/i), { target: { value: 'Berlin' } })
    fireEvent.click(await screen.findByText('Berlin, Germany'))
    expect(onSelectPlace).toHaveBeenCalledWith({ lat: 52.52, lon: 13.41, name: 'Berlin, Germany' })
  })
})
