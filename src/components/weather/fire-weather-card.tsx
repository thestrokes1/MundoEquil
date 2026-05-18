'use client'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { FireWeatherData, FireRiskLevel } from '@/app/api/fire-weather/route'

const RISK_CONFIG: Record<FireRiskLevel, { label: string; color: string }> = {
  bajo:    { label: 'Bajo',     color: '#4ade80' },
  moderado:{ label: 'Moderado', color: '#facc15' },
  alto:    { label: 'Alto',     color: '#fb923c' },
  muy_alto:{ label: 'Muy alto', color: '#f87171' },
  extremo: { label: 'Extremo',  color: '#e879f9' },
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const d = label ? new Date(label) : null
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{d?.toLocaleString('es-MX', { weekday: 'short', day: 'numeric', hour: '2-digit' })}</div>
      <div className="text-orange-400">Índice: {payload[0].value}/100</div>
    </div>
  )
}

export function FireWeatherCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<FireWeatherData>({
    queryKey: ['fire-weather', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/fire-weather?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || !('riskLevel' in data)) return null

  const risk = RISK_CONFIG[data.riskLevel]
  const chartData = data.forecast
    .filter((_, i) => i % 3 === 0)
    .map(h => ({ time: h.time, index: h.fireIndex }))

  const highRisk = data.riskLevel === 'alto' || data.riskLevel === 'muy_alto' || data.riskLevel === 'extremo'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🔥 Riesgo de Incendio</h3>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-xl border"
          style={{ color: risk.color, borderColor: risk.color + '44', background: risk.color + '1a' }}
        >
          {risk.label}
        </span>
      </div>

      {/* Gradient gauge */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
          <span>Bajo</span><span>Moderado</span><span>Alto</span><span>Extremo</span>
        </div>
        <div className="relative h-2 rounded-full overflow-visible" style={{
          background: 'linear-gradient(to right, #4ade80 0%, #facc15 33%, #fb923c 60%, #f87171 80%, #e879f9 100%)'
        }}>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-slate-900 shadow-lg transition-all"
            style={{ left: `calc(${Math.min(data.riskScore, 99)}% - 6px)` }}
          />
        </div>
        <div className="text-right text-[10px] text-slate-500 mt-1.5">Índice: {data.riskScore}/100</div>
      </div>

      {/* Current conditions grid */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Temperatura</div>
          <div className={`font-semibold ${data.current.temp !== null && data.current.temp > 30 ? 'text-orange-400' : 'text-slate-200'}`}>
            {data.current.temp !== null ? `${data.current.temp.toFixed(1)}°C` : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Humedad</div>
          <div className={`font-semibold ${data.current.humidity !== null && data.current.humidity < 30 ? 'text-red-400' : 'text-slate-200'}`}>
            {data.current.humidity !== null ? `${data.current.humidity}%` : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Viento</div>
          <div className="text-slate-200 font-semibold">
            {data.current.windSpeed !== null ? `${Math.round(data.current.windSpeed)} km/h` : '—'}
          </div>
        </div>
      </div>

      {highRisk && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border" style={{
          background: risk.color + '15', borderColor: risk.color + '35', color: risk.color
        }}>
          ⚠ Condiciones favorables para incendios forestales. Evita actividades con fuego en exteriores.
        </div>
      )}

      {/* 7-day fire index chart */}
      {chartData.length > 0 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickFormatter={t => new Date(t).toLocaleDateString('es-MX', { weekday: 'short' })}
                tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={7}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={40} stroke="rgba(251,146,60,0.25)" strokeDasharray="3 3" />
              <ReferenceLine y={60} stroke="rgba(248,113,113,0.25)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="index" stroke="#fb923c" strokeWidth={2} fill="url(#fireGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-1 text-[10px] text-slate-700 text-center">
        Índice basado en temperatura, humedad, viento y probabilidad de lluvia
      </div>
    </div>
  )
}
