'use client'
import { useLocationStore } from '@/stores/location-store'
import { useWeather } from '@/hooks/use-weather'
import { Skeleton } from '@/components/ui/skeleton'

function getLevel(km: number) {
  if (km >= 10) return { label: 'Excelente', color: '#4ade80', desc: 'Visibilidad perfecta' }
  if (km >= 5)  return { label: 'Buena',     color: '#a3e635', desc: 'Visibilidad aceptable' }
  if (km >= 2)  return { label: 'Moderada',  color: '#facc15', desc: 'Cierta neblina' }
  if (km >= 1)  return { label: 'Baja',      color: '#fb923c', desc: 'Niebla moderada' }
  return               { label: 'Muy baja',  color: '#f87171', desc: 'Niebla espesa' }
}

function fogRisk(humidity: number, dewPoint: number, temp: number) {
  const spread = temp - dewPoint
  if (spread <= 2 && humidity >= 90) return { risk: 'Alto',     color: '#f87171', advice: 'Condiciones de niebla densa' }
  if (spread <= 4 && humidity >= 80) return { risk: 'Moderado', color: '#facc15', advice: 'Posible neblina al amanecer' }
  return                                    { risk: 'Bajo',     color: '#4ade80', advice: 'Poco riesgo de niebla' }
}

export function VisibilityCard() {
  const location = useLocationStore(s => s.location)
  const { data: weather, isLoading } = useWeather(location)

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <Skeleton className="h-32 bg-white/10" />
      </div>
    )
  }
  if (!weather) return null

  const c = weather.current
  const vis = c.visibility
  const level = getLevel(vis)
  const fog = fogRisk(c.humidity, c.dewPoint, c.temperature)
  const pct = Math.min((vis / 15) * 100, 100)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          👁 Visibilidad
        </h3>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-xl border"
          style={{ color: level.color, borderColor: level.color + '44', background: level.color + '1a' }}
        >
          {level.label}
        </span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-4xl font-bold tabular-nums" style={{ color: level.color }}>
          {vis >= 10 ? '≥10' : vis.toFixed(1)}
        </span>
        <span className="text-slate-500 text-sm">km</span>
        <span className="ml-auto text-xs text-slate-500">{level.desc}</span>
      </div>

      {/* Gauge */}
      <div className="mb-4">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: 'linear-gradient(to right, #f87171, #facc15, #4ade80)' }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-700 mt-1">
          <span>0</span><span>5 km</span><span>10 km</span><span>≥15 km</span>
        </div>
      </div>

      {/* Stats inline */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/5 rounded-2xl px-3 py-2">
          <div className="text-[10px] text-slate-500 mb-0.5">Punto de rocío</div>
          <div className="text-sm font-semibold text-slate-200">{Math.round(c.dewPoint)}°C</div>
        </div>
        <div className="bg-white/5 rounded-2xl px-3 py-2">
          <div className="text-[10px] text-slate-500 mb-0.5">Spread temp-rocío</div>
          <div className="text-sm font-semibold text-slate-200">{(c.temperature - c.dewPoint).toFixed(1)}°C</div>
        </div>
      </div>

      {/* Fog risk */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border"
        style={{ color: fog.color, borderColor: fog.color + '33', background: fog.color + '11' }}
      >
        <span className="font-semibold">Niebla: {fog.risk}</span>
        <span className="opacity-60">— {fog.advice}</span>
      </div>
    </div>
  )
}
