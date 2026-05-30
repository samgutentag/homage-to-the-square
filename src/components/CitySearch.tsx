import { useEffect, useRef, useState } from 'react'
import { searchCities } from '../data/location'
import type { ResolvedPlace } from '../engine/types'

interface CitySearchProps {
  onSelect: (place: ResolvedPlace) => void
}

export const CitySearch = ({ onSelect }: CitySearchProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResolvedPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const id = window.setTimeout(async () => {
      try {
        const found = await searchCities(q)
        if (cancelled) return
        setResults(found)
        setError(found.length ? null : 'No matches')
      } catch (e) {
        if (!cancelled) {
          setResults([])
          setError((e as Error).message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [query])

  // close the results when clicking outside
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setResults([])
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  const choose = (place: ResolvedPlace) => {
    onSelect(place)
    setQuery('')
    setResults([])
    setError(null)
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a city…"
        aria-label="Search city"
        className="w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none"
      />
      {(loading || error || results.length > 0) && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded border border-white/15 bg-[#1a1a1a] text-sm shadow-lg">
          {loading && <li className="px-2 py-1.5 text-white/40">Searching…</li>}
          {!loading && error && <li className="px-2 py-1.5 text-white/40">{error}</li>}
          {!loading &&
            results.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="block w-full px-2 py-1.5 text-left text-white/85 hover:bg-white/10"
                >
                  {r.name}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
