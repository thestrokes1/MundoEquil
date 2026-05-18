'use client'
import { useState } from 'react'
import { Activity, ExternalLink, Filter } from 'lucide-react'
import { getMagnitudeColor } from '@/lib/utils'
import { DataFreshness } from '@/components/shared/data-freshness'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useEarthquakes } from '@/hooks/use-weather'
import type { Earthquake } from '@/types/weather'

const MAG_FILTERS = [
  { label: 'Todos ≥2.5', value: 2.5 },
  { label: '≥4.0', value: 4.0 },
  { label: '≥5.0 Sig.', value: 5.0 },
  { label: '≥6.0 Fuertes', value: 6.0 },
]

const TIME_FILTERS = [
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
  { label: '7 días', value: 168 },
]

export function EarthquakeCard() {
  const [minMag, setMinMag] = useState(2.5)
  const [hours, setHours] = useState(24)
  const { data: earthquakes, isLoading, isFetching } = useEarthquakes(minMag, hours)

  const updatedAt = new Date().toISOString()
  const significant = (earthquakes ?? []).filter((e) => e.magnitude >= 5)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Activity className="w-4 h-4 text-red-400 shrink-0" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Sismos Recientes
        </h3>
        {significant.length > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            {significant.length} significativo{significant.length !== 1 ? 's' : ''}
          </Badge>
        )}
        <div className="ml-auto">
          <DataFreshness updatedAt={updatedAt} refetching={isFetching} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-slate-600" />
          <span className="text-[10px] text-slate-600 uppercase tracking-wide">Magnitud</span>
        </div>
        {MAG_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setMinMag(f.value)}
            className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors ${
              minMag === f.value
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px bg-white/10 mx-1 self-stretch" />
        {TIME_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setHours(f.value)}
            className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors ${
              hours === f.value
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl bg-white/10" />
          ))}
        </div>
      ) : !earthquakes || earthquakes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          Sin sismos ≥{minMag} en las últimas {hours < 48 ? `${hours}h` : `${hours / 24} días`}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
          {earthquakes.slice(0, 15).map((eq) => (
            <div
              key={eq.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="shrink-0 w-14 text-center">
                <div className={`text-xl font-bold font-mono leading-none ${getMagnitudeColor(eq.magnitude)}`}>
                  {eq.magnitude.toFixed(1)}
                </div>
                <div className="text-[9px] text-slate-600 mt-0.5">M</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-200 truncate font-medium">{eq.place}</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                  <span>
                    {new Date(eq.time).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                    {' '}
                    {new Date(eq.time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>·</span>
                  <span>Prof. {Math.round(eq.depth)} km</span>
                  <span>·</span>
                  <span>{eq.lat.toFixed(1)}°, {eq.lon.toFixed(1)}°</span>
                </div>
              </div>
              <a
                href={eq.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0"
                title="Ver en USGS"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] text-slate-600 text-center">
        Fuente: USGS Earthquake Hazards Program · {earthquakes?.length ?? 0} eventos encontrados
      </div>
    </div>
  )
}

export function EarthquakeSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
      <Skeleton className="h-4 w-40 bg-white/10" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-2xl bg-white/10" />
      ))}
    </div>
  )
}
