import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModePicker } from './ModePicker'
import { ModeProvider, useMode } from '../ModeContext'

const Probe = () => { const { mode } = useMode(); return <span data-testid="mode">{mode}</span> }

describe('ModePicker', () => {
  it('switches the active mode through the popover', () => {
    render(<ModeProvider><ModePicker /><Probe /></ModeProvider>)
    expect(screen.getByTestId('mode').textContent).toBe('live')
    // open the Mode popover, then pick Playground
    fireEvent.click(screen.getByRole('button', { name: /mode/i }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /playground/i }))
    expect(screen.getByTestId('mode').textContent).toBe('playground')
  })
})
