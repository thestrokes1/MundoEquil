'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { HistoryDay } from '@/hooks/use-weather'

interface Props {
  history: HistoryDay[]
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-1">
      <div className="text-slate-400 font-medium mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === 'Lluvia' ? `${p.value} mm` : `${Math.round(p.value)}°`}
        </div>
      ))}
    </div>
  )
}

export function HistoryChart({ history }: Props) {
  const { unit } = useLocationStore()
  const convert = (c: number) => unit === 'fahrenheit' ? Math.round(c * 9 / 5 + 32) : Math.round(c)

  const data = history.map((d) => {
    const date = new Date(d.date + 'T12:00:00')
    return {
      label: date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      max: convert(d.tempMax),
      min: convert(d.tempMin),
      rain: d.precipitation,
    }
  })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Historial — Últimos 14 días
      </h3>
      <div className="flex gap-4 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400/60 inline-block" />Máx</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400/60 inline-block" />Mín</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-500/40 inline-block" />Precipitación</span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="temp"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}°`}
            />
            <YAxis
              yAxisId="rain"
              orientation="right"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}mm`}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="rain" dataKey="rain" name="Lluvia" fill="#38bdf8" opacity={0.3} radius={[2, 2, 0, 0]} />
            <Line yAxisId="temp" type="monotone" dataKey="max" name="Máx" stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171' }} />
            <Line yAxisId="temp" type="monotone" dataKey="min" name="Mín" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function HistoryChartSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
      <Skeleton className="h-4 w-48 bg-white/10" />
      <Skeleton className="h-52 bg-white/10" />
    </div>
  )
}
