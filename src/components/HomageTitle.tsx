import type { ReactNode } from 'react'

export const HOMAGE_WIKI = 'https://en.wikipedia.org/wiki/Homage_to_the_Square'
const PHRASE = 'Homage to the Square'

const linkClass = 'underline decoration-dotted underline-offset-2 hover:decoration-solid'

/** The phrase "Homage to the Square" as a link to the Albers Wikipedia article. */
export const HomageLink = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <a href={HOMAGE_WIKI} target="_blank" rel="noreferrer" className={className ?? linkClass}>
    {children ?? PHRASE}
  </a>
)

/** A generated painting title (`Homage to the Square: …`) with the phrase linked. */
export const PaintingTitle = ({ title, className }: { title: string; className?: string }) => {
  if (!title.startsWith(PHRASE)) return <span className={className}>{title}</span>
  return (
    <span className={className}>
      <HomageLink />
      {title.slice(PHRASE.length)}
    </span>
  )
}
