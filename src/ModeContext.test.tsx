import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModeProvider, useMode } from './ModeContext'

const Probe = () => { const { mode } = useMode(); return <span>{mode}</span> }

describe('ModeProvider', () => {
  it('defaults to live', () => {
    render(<ModeProvider><Probe /></ModeProvider>)
    expect(screen.getByText('live')).toBeInTheDocument()
  })
  it('honors initialMode', () => {
    render(<ModeProvider initialMode="playground"><Probe /></ModeProvider>)
    expect(screen.getByText('playground')).toBeInTheDocument()
  })
})
