import { useEffect, useRef, useState, type ReactNode } from 'react'

export const Overlay = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    const show = () => {
      setVisible(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setVisible(false), 2500)
    }
    window.addEventListener('pointermove', show)
    window.addEventListener('pointerdown', show)
    return () => {
      window.removeEventListener('pointermove', show)
      window.removeEventListener('pointerdown', show)
      window.clearTimeout(timer.current)
    }
  }, [])
  return (
    <div className={`pointer-events-none fixed inset-0 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="pointer-events-auto">{children}</div>
    </div>
  )
}
