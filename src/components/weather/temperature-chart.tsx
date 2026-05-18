'use client'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { formatHour, formatTemp } from '@/lib/utils'
import type { HourlyForecast } from '@/types/weather'

interface Props {
  hourly: HourlyForecast[]
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-1">
      <div className="text-slate-400">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="font-semibold" style={{ color: p.name === 'temp' ? '#f59e0b' : '#94a3b8' }}>
          {p.name === 'temp' ? 'Temperatura' : 'Sensación'}: {Math.round(p.value)}°
        </div>
      ))}
    </div>
  )
}

export function TemperatureChart({ hourly }: Props) {
  const { unit } = useLocationStore()
  const data = hourly.slice(0, 48).map((h) => ({
    time: formatHour(h.time),
    temp: unit === 'fahrenheit' ? h.temperature * 9 / 5 + 32 : h.temperature,
    feels: unit === 'fahrenheit' ? h.feelsLike * 9 / 5 + 32 : h.feelsLike,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Temperatura — 48h
      </h3>
      <div className="flex gap-4 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-amber-400 inline-block" />Temperatura</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-slate-500 inline-block border-dashed border-t border-slate-500" />Sensación térmica</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v)}°`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="temp"
              name="temp"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="feels"
              name="feels"
              stroke="#475569"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 3, fill: '#475569' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
