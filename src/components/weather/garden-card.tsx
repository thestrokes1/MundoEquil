'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { GardenData } from '@/app/api/garden/route'

function scoreColor(s: number) {
  if (s >= 80) return '#22c55e'
  if (s >= 60) return '#84cc16'
  if (s >= 40) return '#eab308'
  if (s >= 20) return '#f97316'
  return '#ef4444'
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excelente'
  if (s >= 60) return 'Bueno'
  if (s >= 40) return 'Regular'
  if (s >= 20) return 'Malo'
  return 'No recomendado'
}

const WATERING = {
  no:       { label: 'No regar',        icon: '✅', color: '#22c55e', desc: 'La lluvia es suficiente' },
  light:    { label: 'Riego ligero',    icon: '💧', color: '#84cc16', desc: 'ET₀ supera ligeramente la lluvia' },
  moderate: { label: 'Riego moderado',  icon: '💧', color: '#eab308', desc: 'Déficit hídrico moderado' },
  high:     { label: 'Riego necesario', icon: '🚿', color: '#f97316', desc: 'Déficit hídrico importante' },
}

export function GardenCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<GardenData>({
    queryKey: ['garden', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/garden?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.scores?.length) return null

  const todayScore = data.scores[0]
  const todayColor = scoreColor(todayScore)
  const water = WATERING[data.wateringNeed]
  const soilTemp = data.daily.soilTemp[0]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌱 Jardín y Huerto</h3>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-xl border"
          style={{ color: todayColor, borderColor: todayColor + '44', background: todayColor + '1a' }}
        >
          {scoreLabel(todayScore)}
        </span>
      </div>

      {/* Score + soil temp */}
      <div className="flex items-end gap-3 mb-4">
        <div className="text-5xl font-bold tabular-nums" style={{ color: todayColor }}>{todayScore}</div>
        <div className="text-slate-400 text-sm mb-1.5">/ 100 hoy</div>
        {soilTemp !== null && (
          <div className="ml-auto text-right">
            <div className="text-[10px] text-slate-500">Suelo</div>
            <div className="text-sm font-bold text-slate-300">{soilTemp.toFixed(1)}°C</div>
          </div>
        )}
      </div>

      {/* Watering + next rain */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-[10px] text-slate-500 mb-1">Riego hoy</div>
          <div className="text-sm font-bold" style={{ color: water.color }}>{water.icon} {water.label}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">{water.desc}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-[10px] text-slate-500 mb-1">Próxima lluvia</div>
          <div className="text-sm font-bold text-slate-300">
            {data.nextRainDay
              ? new Date(data.nextRainDay).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
              : 'Sin lluvia prev.'}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(data.frostDays.length > 0 || data.fungalRiskDays.length > 0) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {data.frostDays.length > 0 && (
            <div className="text-[11px] px-2.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300">
              🧊 Helada en {data.frostDays.length} día{data.frostDays.length > 1 ? 's' : ''}
            </div>
          )}
          {data.fungalRiskDays.length > 0 && (
            <div className="text-[11px] px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
              🍄 Riesgo fúngico en {data.fungalRiskDays.length} día{data.fungalRiskDays.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* 10-day bar chart */}
      <div className="text-[10px] text-slate-600 mb-2">Condiciones para jardinería — 10 días</div>
      <div className="flex gap-1 items-end h-16">
        {data.scores.map((score, i) => {
          const label = new Date(data.daily.time[i]).toLocaleDateString('es-MX', { weekday: 'short' })
          const color = scoreColor(score)
          const barH = Math.max(4, Math.round(score * 0.56))
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: barH, background: color, opacity: i === 0 ? 1 : 0.6 }}
              />
              <div className="text-[8px] text-slate-600 leading-tight">{label}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-[9px] text-slate-700 text-center">
        Índice basado en temperatura, lluvia, viento, UV y riesgo de helada
      </div>
    </div>
  )
}
