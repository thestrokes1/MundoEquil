'use client'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { AQIForecastPoint } from '@/app/api/aqi-forecast/route'

function aqiColor(aqi: number | null): string {
  if (aqi === null) return '#64748b'
  if (aqi <= 20) return '#4ade80'
  if (aqi <= 40) return '#a3e635'
  if (aqi <= 60) return '#facc15'
  if (aqi <= 80) return '#fb923c'
  if (aqi <= 100) return '#f87171'
  return '#e879f9'
}

function aqiLabel(aqi: number | null): string {
  if (aqi === null) return '—'
  if (aqi <= 20) return 'Muy buena'
  if (aqi <= 40) return 'Buena'
  if (aqi <= 60) return 'Moderada'
  if (aqi <= 80) return 'Mala'
  if (aqi <= 100) return 'Muy mala'
  return 'Extrema'
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const aqi = payload[0].value
  const time = label ? new Date(label).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{time}</div>
      <div className="font-semibold" style={{ color: aqiColor(aqi) }}>AQI {Math.round(aqi)} — {aqiLabel(aqi)}</div>
    </div>
  )
}

export function AQIForecastCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<AQIForecastPoint[]>({
    queryKey: ['aqi-forecast', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/aqi-forecast?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!Array.isArray(data) || data.length === 0) return null

  const now = new Date()
  const currentIdx = data.reduce((best, p, i) =>
    Math.abs(new Date(p.time).getTime() - now.getTime()) <
    Math.abs(new Date(data[best].time).getTime() - now.getTime()) ? i : best
  , 0)

  const currentAQI = data[currentIdx].europeanAQI
  const color = aqiColor(currentAQI)

  const maxAQI = Math.max(...data.map(p => p.europeanAQI ?? 0))
  const peakPoint = data.find(p => p.europeanAQI === maxAQI)

  const chartData = data.map(p => ({
    time: p.time,
    aqi: p.europeanAQI,
  }))

  // Dynamic gradient stops
  const gradId = 'aqiGrad'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Pronóstico de Calidad del Aire</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{ color, borderColor: color + '44', background: color + '1a' }}>
          {aqiLabel(currentAQI)}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <div className="text-4xl font-bold tabular-nums" style={{ color }}>{currentAQI ?? '—'}</div>
        <div className="text-slate-400 text-sm mb-1">AQI Europeo ahora</div>
      </div>

      {peakPoint && maxAQI > (currentAQI ?? 0) && (
        <div className="mb-3 text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-400">
          Pico previsto: <span style={{ color: aqiColor(maxAQI) }} className="font-semibold">{maxAQI} ({aqiLabel(maxAQI)})</span>
          {' '}el{' '}
          {new Date(peakPoint.time).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit' })}
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={11}
            />
            <YAxis domain={[0, Math.max(maxAQI + 10, 60)]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={20} stroke="rgba(74,222,128,0.3)" strokeDasharray="3 3" />
            <ReferenceLine y={60} stroke="rgba(251,146,60,0.3)" strokeDasharray="3 3" />
            <ReferenceLine y={100} stroke="rgba(248,113,113,0.3)" strokeDasharray="3 3" />
            <ReferenceLine x={data[currentIdx]?.time} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="aqi" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pollutant breakdown */}
      {data[currentIdx] && (
        <div className="mt-3 grid grid-cols-4 gap-2 text-[10px]">
          {[
            { label: 'PM2.5', value: data[currentIdx].pm25, unit: 'μg/m³' },
            { label: 'PM10', value: data[currentIdx].pm10, unit: 'μg/m³' },
            { label: 'O₃', value: data[currentIdx].ozone, unit: 'μg/m³' },
            { label: 'NO₂', value: data[currentIdx].no2, unit: 'μg/m³' },
          ].map(p => (
            <div key={p.label} className="bg-white/5 rounded-xl p-2 text-center">
              <div className="text-slate-500 mb-0.5">{p.label}</div>
              <div className="text-slate-300 font-medium">{p.value !== null ? p.value.toFixed(1) : '—'}</div>
              <div className="text-slate-600">{p.unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
