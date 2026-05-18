'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { PollenCalendarData } from '@/app/api/pollen-calendar/route'

const MONTH_LABELS = ['E','F','M','A','M','J','J','A','S','O','N','D']

function IntensityCell({ value, color, isCurrent }: { value: number; color: string; isCurrent: boolean }) {
  const opacity = value === 0 ? 0.04 : value / 5
  return (
    <div
      className={`h-5 rounded-sm flex items-center justify-center ${isCurrent ? 'ring-1 ring-white/40' : ''}`}
      style={{ background: value > 0 ? `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : 'rgba(255,255,255,0.04)' }}
    >
      {value >= 3 && <div className="w-1 h-1 rounded-full" style={{ background: color }} />}
    </div>
  )
}

export function PollenCalendarCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<PollenCalendarData>({
    queryKey: ['pollen-calendar', location?.lat],
    queryFn: () => fetch(`/api/pollen-calendar?lat=${location!.lat}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-56 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data) return null

  const currentIdx = data.currentMonth - 1

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌺 Calendario de Polen</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border border-white/10 bg-white/5 text-slate-400">
          {data.hemisphere === 'north' ? '🌍 Hemisferio N.' : '🌏 Hemisferio S.'}
        </span>
      </div>

      {/* Current allergens */}
      {data.currentAllergens.length > 0 ? (
        <div className="mb-4 px-3 py-2 rounded-xl text-xs border border-yellow-500/20 bg-yellow-500/10 text-yellow-300">
          ⚠️ Activo este mes: {data.currentAllergens.join(' · ')}
        </div>
      ) : (
        <div className="mb-4 px-3 py-2 rounded-xl text-xs border border-green-500/20 bg-green-500/10 text-green-300">
          ✅ Mes con baja actividad polínica
        </div>
      )}

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[8px] text-slate-600 pr-2 pb-1 w-24">Especie</th>
              {MONTH_LABELS.map((m, i) => (
                <th key={i} className={`text-center text-[8px] pb-1 w-5 ${i === currentIdx ? 'text-sky-400 font-bold' : 'text-slate-600'}`}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="space-y-0.5">
            {data.species.map((s, si) => (
              <tr key={si}>
                <td className="pr-2 pb-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{s.emoji}</span>
                    <span className="text-[9px] text-slate-400 truncate">{s.name}</span>
                  </div>
                </td>
                {s.intensity.map((val, mi) => (
                  <td key={mi} className="pb-0.5 px-0.5">
                    <IntensityCell value={val} color={s.color} isCurrent={mi === currentIdx} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-3 justify-between text-[8px] text-slate-600">
        <span>■ = alta intensidad · □ = baja/nula</span>
        <span className="text-sky-500">◻ = mes actual</span>
      </div>

      {/* Type legend */}
      <div className="mt-2 flex gap-3 flex-wrap">
        {(['tree','grass','weed','mold'] as const).map(type => {
          const sp = data.species.find(s => s.type === type)
          if (!sp) return null
          return (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ background: sp.color }} />
              <span className="text-[8px] text-slate-600">
                {type === 'tree' ? 'Árbol' : type === 'grass' ? 'Gramínea' : type === 'weed' ? 'Maleza' : 'Hongo'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
