'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { AirMassData, AirMassType } from '@/app/api/air-mass/route'

const MASS_COLOR: Record<AirMassType, string> = {
  cA:  '#a5b4fc',
  cAA: '#7c3aed',
  cP:  '#38bdf8',
  mP:  '#34d399',
  cT:  '#f97316',
  mT:  '#fbbf24',
  mE:  '#ef4444',
}

const STAB_COLOR: Record<AirMassData['stability'], string> = {
  very_stable:   '#22c55e',
  stable:        '#84cc16',
  neutral:       '#94a3b8',
  unstable:      '#f97316',
  very_unstable: '#ef4444',
}

export function AirMassCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<AirMassData>({
    queryKey: ['air-mass', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/air-mass?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const color = MASS_COLOR[data.massType]
  const stabColor = STAB_COLOR[data.stability]

  const today24  = data.hours.slice(0, 24)
  const uniqueTypes = [...new Set(today24.map(h => h.massType))]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌍 Masa de Aire</h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl border" style={{
          color, borderColor: color + '44', background: color + '1a',
        }}>
          {data.massType}
        </span>
      </div>

      {/* Origin */}
      <div className="mb-3 px-3 py-2 rounded-xl text-xs border" style={{
        borderColor: color + '30', background: color + '0e', color,
      }}>
        {data.origin}
      </div>

      {/* Properties */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Temperatura</div>
          <div className="text-xl font-bold text-slate-200">{data.temp}°</div>
          <div className="text-[9px] text-slate-500">°C</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Humedad</div>
          <div className="text-xl font-bold text-slate-200">{data.humidity}%</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Altura mezcla</div>
          <div className="text-xl font-bold text-slate-200">{data.mixingHeight >= 1000 ? `${(data.mixingHeight / 1000).toFixed(1)}k` : data.mixingHeight}</div>
          <div className="text-[9px] text-slate-500">m</div>
        </div>
      </div>

      {/* Stability */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-4">
        <span className="text-sm">⚖️</span>
        <div>
          <div className="text-[9px] text-slate-600">Estabilidad atmosférica</div>
          <div className="text-sm font-semibold" style={{ color: stabColor }}>{data.stabilityLabel}</div>
        </div>
      </div>

      {/* Characteristics */}
      <div className="space-y-1.5 mb-4">
        {data.characteristics.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px] text-slate-400">
            <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
            <span>{c}</span>
          </div>
        ))}
      </div>

      {/* 24h transitions */}
      <div className="text-[10px] text-slate-600 mb-1.5">Tipo de masa — próximas 24h</div>
      <div className="flex gap-0.5 h-5">
        {today24.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ background: h.color + '99' }} title={`${h.hour} — ${h.massType}`} />
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        {uniqueTypes.map(t => (
          <div key={t} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: MASS_COLOR[t] }} />
            <span className="text-[8px] text-slate-600">{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
