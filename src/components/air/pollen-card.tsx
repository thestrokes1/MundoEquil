'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { PollenData } from '@/app/api/pollen/route'

interface PollenLevel {
  label: string
  color: string
  bg: string
  advice: string
}

function pollenLevel(value: number | null): PollenLevel {
  if (value === null || value === 0) return { label: 'Ninguno', color: '#64748b', bg: 'bg-slate-500/20', advice: 'Sin riesgo alérgico' }
  if (value <= 10) return { label: 'Bajo', color: '#4ade80', bg: 'bg-green-500/20', advice: 'Riesgo bajo' }
  if (value <= 30) return { label: 'Moderado', color: '#facc15', bg: 'bg-yellow-500/20', advice: 'Posibles síntomas leves' }
  if (value <= 80) return { label: 'Alto', color: '#fb923c', bg: 'bg-orange-500/20', advice: 'Síntomas probables' }
  return { label: 'Muy alto', color: '#f87171', bg: 'bg-red-500/20', advice: 'Evita exteriores' }
}

interface PollenBarProps {
  label: string
  value: number | null
  max: number
}

function PollenBar({ label, value, max }: PollenBarProps) {
  const level = pollenLevel(value)
  const pct = value !== null && max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">{value !== null ? `${Math.round(value)} gr/m³` : '—'}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: level.color, background: level.color + '22' }}>
            {level.label}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: level.color }}
        />
      </div>
    </div>
  )
}

export function PollenCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<PollenData>({
    queryKey: ['pollen', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/pollen?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 bg-white/10" />)}
        </div>
      </div>
    )
  }

  if (!data || !data.current) return null

  const c = data.current
  const hasAnyData = Object.values(c).some(v => v !== null && v > 0)

  const allValues = [c.grassPollen, c.birchPollen, c.alderPollen, c.mugwortPollen, c.ragweedPollen, c.olivePollen]
  const maxVal = Math.max(...allValues.filter((v): v is number => v !== null && v > 0), 1)

  const dominant = allValues.reduce((best, v, i) => {
    if (v === null) return best
    if (best.val === null || v > best.val) return { val: v, idx: i }
    return best
  }, { val: null as number | null, idx: -1 })

  const labels = ['Gramíneas', 'Abedul', 'Aliso', 'Artemisa', 'Ambrosía', 'Olivo']
  const dominantLevel = pollenLevel(dominant.val)

  const overallAdvice = !hasAnyData
    ? 'Sin polen detectado — buenas condiciones para alérgicos.'
    : `${labels[dominant.idx] ?? 'Polen'} dominante. ${dominantLevel.advice}.`

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Polen / Alergias</h3>
        {hasAnyData && dominant.val !== null && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-xl border" style={{ color: dominantLevel.color, borderColor: dominantLevel.color + '44', background: dominantLevel.color + '1a' }}>
            {dominantLevel.label}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-4 leading-relaxed">{overallAdvice}</p>

      <div className="space-y-3">
        {[
          { key: 'grassPollen', label: 'Gramíneas', value: c.grassPollen },
          { key: 'birchPollen', label: 'Abedul', value: c.birchPollen },
          { key: 'alderPollen', label: 'Aliso', value: c.alderPollen },
          { key: 'olivePollen', label: 'Olivo', value: c.olivePollen },
          { key: 'mugwortPollen', label: 'Artemisa', value: c.mugwortPollen },
          { key: 'ragweedPollen', label: 'Ambrosía', value: c.ragweedPollen },
        ]
          .filter(p => p.value !== null)
          .map(p => (
            <PollenBar key={p.key} label={p.label} value={p.value} max={maxVal} />
          ))
        }
      </div>

      {!hasAnyData && (
        <div className="mt-2 text-center text-xs text-slate-600 py-4">
          No hay datos de polen disponibles para esta ubicación
        </div>
      )}
    </div>
  )
}
