import { useEffect, useState } from 'react'

/**
 * Latches to true the first time `ready` is true, or after `fallbackMs` regardless —
 * so the painting fades in once real data arrives, but never stays blank if the
 * fetch is slow or fails. Once revealed, stays revealed.
 */
export const useReveal = (ready: boolean, fallbackMs = 2500): boolean => {
  const [revealed, setRevealed] = useState(false)

  // Latch on the ready→true transition by adjusting state during render (React's
  // sanctioned pattern), so we never call setState synchronously inside the effect.
  if (ready && !revealed) setRevealed(true)

  useEffect(() => {
    if (revealed) return
    const id = setTimeout(() => setRevealed(true), fallbackMs)
    return () => clearTimeout(id)
  }, [revealed, fallbackMs])

  return revealed
}
