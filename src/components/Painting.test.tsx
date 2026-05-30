import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Painting } from './Painting'
import { buildComposition } from '../engine/composition'
import { buildPalette } from '../engine/palette'
import type { Environment } from '../engine/types'

const env: Environment = { hueDeg: 200, chroma: 0.7, lightness: 0.5, warmShift: 0, fogContrast: 1, moonLift: 0 }

describe('Painting', () => {
  it('renders four squares with oklch backgrounds', () => {
    const { container } = render(
      <Painting composition={buildComposition(30, 40)} palette={buildPalette(env)} />,
    )
    const squares = container.querySelectorAll('[data-square]')
    expect(squares).toHaveLength(4)
    expect((squares[0] as HTMLElement).style.backgroundColor).toContain('oklch')
  })
})
