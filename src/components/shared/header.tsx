'use client'
import { Globe2, Thermometer } from 'lucide-react'
import { LiveClock } from './live-clock'
import { LocationSearch } from './location-search'
import { PreferencesButton } from './preferences-panel'
import { useLocationStore } from '@/stores/location-store'

export function Header() {
  const { unit, setUnit, speedUnit, setSpeedUnit } = useLocationStore()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 dark:bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Globe2 className="w-6 h-6 text-sky-400" />
          <span className="text-lg font-bold text-slate-100 tracking-tight hidden sm:block">MundoEquil</span>
        </div>

        {/* Search — crece */}
        <div className="flex-1 min-w-0">
          <LocationSearch />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setUnit(unit === 'celsius' ? 'fahrenheit' : 'celsius')}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 transition-colors"
          >
            <Thermometer className="w-3.5 h-3.5" />
            {unit === 'celsius' ? '°C' : '°F'}
          </button>
          <button
            onClick={() => setSpeedUnit(speedUnit === 'kmh' ? 'mph' : 'kmh')}
            className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 transition-colors"
          >
            {speedUnit === 'kmh' ? 'km/h' : 'mph'}
          </button>
          <PreferencesButton />
        </div>

        {/* Clock */}
        <div className="shrink-0 hidden md:block">
          <LiveClock />
        </div>
      </div>
    </header>
  )
}
