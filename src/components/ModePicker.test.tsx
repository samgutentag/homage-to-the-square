import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModePicker } from './ModePicker'
import { ModeProvider, useMode } from '../ModeContext'

const Probe = () => { const { mode } = useMode(); return <span data-testid="mode">{mode}</span> }

describe('ModePicker', () => {
  it('switches the active mode', () => {
    render(<ModeProvider><ModePicker /><Probe /></ModeProvider>)
    expect(screen.getByTestId('mode').textContent).toBe('live')
    fireEvent.click(screen.getByRole('button', { name: /playground/i }))
    expect(screen.getByTestId('mode').textContent).toBe('playground')
  })
})
