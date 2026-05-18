'use client'
import { useQuery } from '@tanstack/react-query'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { FloodData } from '@/app/api/flood/route'

interface FloodRisk {
  label: string
  color: string
  bg: string
}

function floodRisk(current: number | null, max: number | null): FloodRisk {
  if (current === null || max === null || max === 0) return { label: 'Sin datos', color: '#64748b', bg: 'bg-slate-500/20' }
  const ratio = current / max
  if (ratio < 0.4) return { label: 'Bajo', color: '#4ade80', bg: 'bg-green-500/20' }
  if (ratio < 0.65) return { label: 'Moderado', color: '#facc15', bg: 'bg-yellow-500/20' }
  if (ratio < 0.85) return { label: 'Elevado', color: '#fb923c', bg: 'bg-orange-500/20' }
  return { label: 'Crítico', color: '#f87171', bg: 'bg-red-500/20' }
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = label ? new Date(label).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-1">
      <div className="text-slate-400 mb-0.5">{d}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(1)} m³/s</div>
      ))}
    </div>
  )
}

export function FloodCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<FloodData>({
    queryKey: ['flood', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/flood?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 21_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  const d = data?.daily
  if (!d || d.time.length === 0 || d.riverDischarge.every(v => v === null)) return null

  const currentDischarge = d.riverDischarge[0]
  const maxDischarge = Math.max(...(d.riverDischargeMax.filter((v): v is number => v !== null)))
  const risk = floodRisk(currentDischarge, maxDischarge)

  const chartData = d.time.map((t, i) => ({
    time: t,
    'Caudal medio': d.riverDischarge[i],
    'Máx': d.riverDischargeMax[i],
    'Mín': d.riverDischargeMin[i],
  })).filter(p => p['Caudal medio'] !== null)

  const peakIdx = d.riverDischargeMax.reduce<number>((best, v, i) => {
    const bv = d.riverDischargeMax[best]
    return v !== null && (bv === null || v > (bv ?? 0)) ? i : best
  }, 0)
  const peakDay = d.time[peakIdx]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Caudal de Ríos</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{ color: risk.color, borderColor: risk.color + '44', background: risk.color + '1a' }}>
          Riesgo {risk.label}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <div className="text-4xl font-bold tabular-nums" style={{ color: risk.color }}>
          {currentDischarge !== null ? currentDischarge.toFixed(1) : '—'}
        </div>
        <div className="text-slate-400 text-sm mb-1">m³/s hoy</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Pico previsto</div>
          <div className="text-slate-200 font-semibold">
            {maxDischarge !== -Infinity ? `${maxDischarge.toFixed(1)} m³/s` : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Fecha pico</div>
          <div className="text-slate-200 font-semibold">
            {peakDay ? new Date(peakDay).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : '—'}
          </div>
        </div>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="floodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Máx" stroke="none" fill="#f8717120" />
            <Area type="monotone" dataKey="Mín" stroke="none" fill="url(#floodGrad)" />
            <Line type="monotone" dataKey="Caudal medio" stroke="#38bdf8" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[10px] text-slate-600 text-center">
        Pronóstico de caudal a 16 días — rango Mín/Máx
      </div>
    </div>
  )
}
