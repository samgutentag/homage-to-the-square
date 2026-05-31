import type { Composition, OklchColor } from '../engine/types'
import { oklchCss } from '../engine/color'

interface PaintingProps { composition: Composition; palette: OklchColor[] }

export const Painting = ({ composition, palette }: PaintingProps) => (
  <div
    className="relative"
    style={{ width: '100cqmin', height: '100cqmin' }}
    role="img"
    aria-label="Homage to the Square"
  >
    {composition.insets.map((inset, i) => (
      <div
        key={i}
        data-square
        style={{
          position: 'absolute',
          top: `${inset.top}%`,
          left: `${inset.left}%`,
          right: `${inset.right}%`,
          bottom: `${inset.bottom}%`,
          backgroundColor: oklchCss(palette[i]),
          opacity: composition.opacities[i],
          transition: 'all 1s ease, background-color 1s ease',
        }}
      />
    ))}
  </div>
)
