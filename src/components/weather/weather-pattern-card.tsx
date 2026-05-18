'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { WeatherPatternData, WeatherPatternType } from '@/app/api/weather-pattern/route'

const PATTERN_META: Record<WeatherPatternType, { label: string; color: string }> = {
  anticyclone: { label: 'Anticiclón',    color: '#22c55e' },
  ridge:       { label: 'Dorsal alta',   color: '#84cc16' },
  trough:      { label: 'Vaguada',       color: '#eab308' },
  cyclone:     { label: 'Ciclón',        color: '#ef4444' },
  frontal:     { label: 'Paso frontal',  color: '#38bdf8' },
  cutoff_low:  { label: 'Gota fría',     color: '#f97316' },
  thermal_low: { label: 'Baja térmica',  color: '#fb923c' },
}

const TREND_COLOR = { improving: '#22c55e', stable: '#94a3b8', deteriorating: '#ef4444' }
const FRONT_LABEL = { cold: 'Frente frío', warm: 'Frente cálido', occluded: 'Frente ocluido' }

export function WeatherPatternCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<WeatherPatternData>({
    queryKey: ['weather-pattern', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/weather-pattern?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const meta  = PATTERN_META[data.pattern]
  const trendColor = TREND_COLOR[data.trend]

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    pressure: h.pressure,
  }))

  const pRange = {
    min: Math.min(...chartData.map(d => d.pressure)) - 1,
    max: Math.max(...chartData.map(d => d.pressure)) + 1,
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🗺️ Situación Sinóptica</h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl border" style={{
          color: meta.color, borderColor: meta.color + '44', background: meta.color + '1a',
        }}>
          {meta.label}
        </span>
      </div>

      {/* Synopsis */}
      <div className="mb-4 px-3 py-2.5 rounded-xl text-xs border border-white/10 bg-white/5 text-slate-300 leading-relaxed">
        {data.synopsis}
      </div>

      {/* Pressure metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Presión</div>
          <div className="text-xl font-bold text-slate-200">{data.pressureHPa}</div>
          <div className="text-[9px] text-slate-500">hPa</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Cambio 3h</div>
          <div className="text-xl font-bold" style={{ color: trendColor }}>
            {data.pressureChange3h > 0 ? '+' : ''}{data.pressureChange3h}
          </div>
          <div className="text-[9px] text-slate-500">hPa</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Tendencia</div>
          <div className="text-sm font-bold mt-1" style={{ color: trendColor }}>{data.trendLabel}</div>
        </div>
      </div>

      {/* Front info */}
      {data.frontPassage && data.frontType && (
        <div className="mb-4 px-3 py-2 rounded-xl text-xs border border-sky-500/20 bg-sky-500/10 text-sky-300">
          ➡️ {FRONT_LABEL[data.frontType]} detectado — cambio de condiciones próximo
        </div>
      )}

      {/* 48h pressure chart */}
      <div className="text-[10px] text-slate-600 mb-1">Presión superficial — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="presGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={meta.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={meta.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis domain={[pRange.min, pRange.max]} tick={{ fontSize: 7, fill: '#475569' }} unit="hPa" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v} hPa`, 'Presión']}
            />
            <Area type="monotone" dataKey="pressure" stroke={meta.color} fill="url(#presGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Additional flags */}
      <div className="mt-2 flex gap-3 flex-wrap text-[9px]">
        {data.windBacking && (
          <span className="px-2 py-0.5 rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-400">↺ Giro veering/backing</span>
        )}
        <span className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-slate-500">Δ24h: {data.pressureChange24h > 0 ? '+' : ''}{data.pressureChange24h} hPa</span>
      </div>
    </div>
  )
}
