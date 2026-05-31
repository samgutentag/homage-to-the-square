import { HomageLink } from './HomageTitle'

export const Footer = () => (
  <footer className="mx-auto max-w-4xl px-4 pb-10 text-center text-xs leading-relaxed text-white/40 md:px-8">
    <p className="italic">
      an homage to an <HomageLink>homage to the square</HomageLink>
    </p>
    <p className="mt-1.5">
      Made with ◻️ in Santa Barbara, CA by{' '}
      <a
        href="https://gutentag.world"
        target="_blank"
        rel="noreferrer"
        className="text-white/60 underline decoration-dotted underline-offset-2 hover:text-white"
      >
        Sam Gutentag
      </a>
    </p>
  </footer>
)
