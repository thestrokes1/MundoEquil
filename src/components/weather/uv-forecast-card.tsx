'use client'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { getUVLabel } from '@/lib/weather-codes'
import type { UVForecastData } from '@/app/api/uv-forecast/route'

const UV_COLOR = (uv: number): string => {
  if (uv <= 2)  return '#4ade80'
  if (uv <= 5)  return '#facc15'
  if (uv <= 7)  return '#fb923c'
  if (uv <= 10) return '#f87171'
  return '#e879f9'
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const uv = payload[0].value as number
  const { label: uvLabel } = getUVLabel(uv)
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{time}</div>
      <div style={{ color: UV_COLOR(uv) }}>UV {uv.toFixed(1)} — {uvLabel}</div>
    </div>
  )
}

export function UVForecastCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<UVForecastData>({
    queryKey: ['uv-forecast', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/uv-forecast?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || !Array.isArray(data.hours) || data.hours.length === 0) return null

  const now = new Date()
  const currentIdx = data.hours.reduce((best, h, i) =>
    Math.abs(new Date(h.time).getTime() - now.getTime()) <
    Math.abs(new Date(data.hours[best].time).getTime() - now.getTime()) ? i : best
  , 0)

  const current = data.hours[currentIdx]
  const currentUV = current.uv ?? 0
  const { label: uvLabel } = getUVLabel(currentUV)
  const uvColor = UV_COLOR(currentUV)

  // Today's UV curve
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const todayChart = data.hours
    .filter(h => {
      const t = new Date(h.time)
      return t >= todayStart && t <= todayEnd && h.isDay === 1
    })
    .map(h => ({ time: h.time, uv: h.uv ?? 0, clearSky: h.clearSkyUV ?? 0 }))

  // 7-day daily max bars (sample every 24h from current)
  const dailyChart: { label: string; max: number }[] = []
  let dayPtr = new Date(todayStart)
  for (let d = 0; d < 7; d++) {
    const dayStr = dayPtr.toISOString().split('T')[0]
    const dayHours = data.hours.filter(h => h.time.startsWith(dayStr))
    const maxUV = Math.max(...dayHours.map(h => h.uv ?? 0), 0)
    const dayDate = new Date(dayStr + 'T12:00:00')
    const label = d === 0 ? 'Hoy' : d === 1 ? 'Mañ.' : dayDate.toLocaleDateString('es-MX', { weekday: 'short' })
    dailyChart.push({ label, max: maxUV })
    dayPtr.setDate(dayPtr.getDate() + 1)
  }

  const protectionMessage = currentUV >= 8
    ? 'Protección muy alta necesaria. Evita exposición directa al sol.'
    : currentUV >= 6
    ? 'Usa protector solar SPF 30+, sombrero y ropa protectora.'
    : currentUV >= 3
    ? 'Usa protector solar SPF 15+ en exposición prolongada.'
    : 'No se necesita protección especial.'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Índice UV</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: uvColor, borderColor: uvColor + '44', background: uvColor + '1a'
        }}>
          {uvLabel}
        </span>
      </div>

      {/* Current UV big display */}
      <div className="flex items-end gap-4 mb-4">
        <div className="text-5xl font-bold tabular-nums" style={{ color: uvColor }}>
          {currentUV.toFixed(1)}
        </div>
        <div className="space-y-1 pb-1 text-xs">
          {data.maxToday !== null && (
            <div className="text-slate-400">Máx. hoy: <span style={{ color: UV_COLOR(data.maxToday) }} className="font-semibold">{data.maxToday.toFixed(1)}</span></div>
          )}
          {data.maxTomorrow !== null && (
            <div className="text-slate-500">Máx. mañana: <span className="font-semibold text-slate-400">{data.maxTomorrow.toFixed(1)}</span></div>
          )}
        </div>
      </div>

      {/* UV scale */}
      <div className="mb-4">
        <div className="h-2 rounded-full overflow-hidden" style={{
          background: 'linear-gradient(to right, #4ade80 0%, #facc15 30%, #fb923c 55%, #f87171 75%, #e879f9 100%)'
        }}>
          <div
            className="h-2 w-0.5 bg-white rounded-full"
            style={{ marginLeft: `${Math.min((currentUV / 12) * 100, 99)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
          <span>Bajo (0–2)</span><span>Mod. (3–5)</span><span>Alto (6–7)</span><span>Muy (8–10)</span><span>Ext. (11+)</span>
        </div>
      </div>

      <div className="mb-4 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400">
        ☀ {protectionMessage}
      </div>

      {/* Today's UV bell curve */}
      {todayChart.length > 0 && (
        <>
          <div className="text-[10px] text-slate-600 mb-1">Índice UV hoy</div>
          <div className="h-24 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={todayChart} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={uvColor} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={uvColor} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="uvClearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#e2e8f0" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={3}
                />
                <YAxis domain={[0, 12]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={3} stroke="rgba(250,204,21,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={6} stroke="rgba(251,146,60,0.2)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="clearSky" stroke="rgba(226,232,240,0.3)" strokeWidth={1} fill="url(#uvClearGrad)" dot={false} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="uv" stroke={uvColor} strokeWidth={2} fill="url(#uvGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* 7-day max bars */}
      {dailyChart.length > 0 && (
        <>
          <div className="text-[10px] text-slate-600 mb-1">UV máximo 7 días</div>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 12]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const uv = payload[0].value as number
                    return (
                      <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
                        <div style={{ color: UV_COLOR(uv) }}>{label}: UV {uv.toFixed(1)}</div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="max" radius={[3, 3, 0, 0]} maxBarSize={16}>
                  {dailyChart.map((entry, i) => (
                    <Cell key={i} fill={UV_COLOR(entry.max)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
