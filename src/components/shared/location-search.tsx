'use client'
import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { useGeocoding } from '@/hooks/use-weather'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useLocationStore } from '@/stores/location-store'
import { cn } from '@/lib/utils'
import type { Location } from '@/types/weather'

export function LocationSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { data: results, isFetching } = useGeocoding(query)
  const { detect, loading: geoLoading } = useGeolocation()
  const setLocation = useLocationStore((s) => s.setLocation)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(loc: Location) {
    setLocation(loc)
    setQuery('')
    setOpen(false)
  }

  async function handleGeo() {
    const loc = await detect()
    if (loc) select(loc)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 focus-within:border-sky-400 transition-colors">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results && results.length > 0) select(results[0])
            if (e.key === 'Escape') { setOpen(false); setQuery('') }
          }}
          placeholder="Buscar ciudad..."
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
        />
        {isFetching && <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
        <button
          onClick={handleGeo}
          disabled={geoLoading}
          title="Usar mi ubicación"
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors disabled:opacity-50"
        >
          {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        </button>
      </div>

      {open && results && results.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {results.map((loc, i) => (
            <li key={`${loc.lat}-${loc.lon}-${i}`}>
              <button
                onClick={() => select(loc)}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-sm',
                  i !== results.length - 1 && 'border-b border-white/5'
                )}
              >
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  <span className="text-slate-100 font-medium">{loc.name}</span>
                  {loc.state && <span className="text-slate-400">, {loc.state}</span>}
                  <span className="text-slate-500"> · {loc.country}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
