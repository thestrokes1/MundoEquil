'use client'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { Location } from '@/types/weather'
import type { PressurePoint } from '@/app/api/pressure-trend/route'

function trend(points: PressurePoint[]): { direction: 'rising' | 'falling' | 'steady'; delta: number } {
  if (points.length < 4) return { direction: 'steady', delta: 0 }
  const now = new Date()
  const past3h = points.filter(p => {
    const t = new Date(p.time)
    return t <= now && t >= new Date(now.getTime() - 3 * 3600_000)
  })
  if (past3h.length < 2) return { direction: 'steady', delta: 0 }
  const delta = past3h[past3h.length - 1].pressure - past3h[0].pressure
  const direction = delta > 0.5 ? 'rising' : delta < -0.5 ? 'falling' : 'steady'
  return { direction, delta: Math.round(delta * 10) / 10 }
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{time}</div>
      <div className="text-violet-300 font-semibold">{payload[0].value} hPa</div>
    </div>
  )
}

interface Props {
  location: Location
}

export function PressureTrendCard({ location }: Props) {
  const { data, isLoading } = useQuery<PressurePoint[]>({
    queryKey: ['pressure-trend', location.lat, location.lon],
    queryFn: () => fetch(`/api/pressure-trend?lat=${location.lat}&lon=${location.lon}`).then(r => r.json()),
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-40 bg-white/10" />
      </div>
    )
  }

  if (!Array.isArray(data) || data.length === 0) return null

  const { direction, delta } = trend(data)
  const nowStr = data.reduce((prev, cur) =>
    Math.abs(new Date(cur.time).getTime() - Date.now()) <
    Math.abs(new Date(prev.time).getTime() - Date.now()) ? cur : prev
  ).time

  const chartData = data.map(p => ({
    time: p.time,
    pressure: p.pressure,
    label: new Date(p.time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  }))

  const pressures = data.map(p => p.pressure)
  const minP = Math.min(...pressures)
  const maxP = Math.max(...pressures)
  const domainPad = 2
  const currentPressure = data.find(p => p.time === nowStr)?.pressure ?? pressures[pressures.length / 2 | 0]

  const directionConfig = {
    rising: { label: 'Subiendo', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30', icon: '↑' },
    falling: { label: 'Bajando', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', icon: '↓' },
    steady: { label: 'Estable', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30', icon: '→' },
  }
  const dc = directionConfig[direction]

  const forecast = {
    rising: 'Presión en ascenso — mejora esperada del tiempo.',
    falling: 'Presión en descenso — posible deterioro o lluvia próxima.',
    steady: 'Presión estable — tiempo sin cambios bruscos.',
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Presión Atmosférica</h3>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl border ${dc.bg} ${dc.color}`}>
          <span>{dc.icon}</span>
          <span>{dc.label}</span>
          {delta !== 0 && <span className="opacity-70">({delta > 0 ? '+' : ''}{delta} hPa)</span>}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl font-bold text-violet-300 tabular-nums">{currentPressure}</div>
        <div className="text-sm text-slate-500">hPa</div>
        <div className="ml-auto text-xs text-slate-500 text-right max-w-[180px] leading-snug">{forecast[direction]}</div>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="pressureGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#a78bfa" stopOpacity={1} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis
              domain={[minP - domainPad, maxP + domainPad]}
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={nowStr} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="pressure"
              stroke="url(#pressureGrad)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-slate-600">
        <span>← 24h pasadas</span>
        <span>ahora</span>
        <span>próximas 24h →</span>
      </div>
    </div>
  )
}

export function PressureTrendSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
      <Skeleton className="h-4 w-40 bg-white/10" />
      <Skeleton className="h-40 bg-white/10" />
    </div>
  )
}
