'use client'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { PollenForecastData } from '@/app/api/pollen-forecast/route'

const POLLEN_LINES = [
  { key: 'grass',   label: 'Gramíneas', color: '#4ade80' },
  { key: 'birch',   label: 'Abedul',    color: '#facc15' },
  { key: 'olive',   label: 'Olivo',     color: '#fb923c' },
  { key: 'mugwort', label: 'Artemisa',  color: '#c084fc' },
  { key: 'alder',   label: 'Aliso',     color: '#38bdf8' },
  { key: 'ragweed', label: 'Ambrosía',  color: '#f87171' },
] as const

type PollenKey = typeof POLLEN_LINES[number]['key']

function pollenRisk(value: number | null): string {
  if (value === null || value === 0) return 'Ninguno'
  if (value <= 10) return 'Bajo'
  if (value <= 30) return 'Moderado'
  if (value <= 80) return 'Alto'
  return 'Muy alto'
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', hour: '2-digit' }) : ''
  const items = payload.filter(p => (p.value as number) > 0)
  if (!items.length) return null
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-0.5">
      <div className="text-slate-400 mb-0.5">{time}</div>
      {items.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {(p.value as number).toFixed(0)} gr/m³</div>
      ))}
    </div>
  )
}

export function PollenForecastCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<PollenForecastData>({
    queryKey: ['pollen-forecast', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/pollen-forecast?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || !Array.isArray(data.points) || data.points.length === 0) return null

  // Find which pollen types have any data
  const activeLines = POLLEN_LINES.filter(line =>
    data.points.some(p => (p[line.key as PollenKey] ?? 0) > 0)
  )

  if (activeLines.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Pronóstico de Polen 5 Días</h3>
        <div className="text-center py-6 text-slate-600 text-xs">Sin datos de polen para esta ubicación</div>
      </div>
    )
  }

  const now = new Date()
  const currentIdx = data.points.reduce((best, p, i) =>
    Math.abs(new Date(p.time).getTime() - now.getTime()) <
    Math.abs(new Date(data.points[best].time).getTime() - now.getTime()) ? i : best
  , 0)

  // Sample every 3 hours for the chart
  const chartData = data.points
    .filter((_, i) => i % 3 === 0)
    .map(p => {
      const obj: Record<string, unknown> = { time: p.time }
      activeLines.forEach(l => { obj[l.label] = p[l.key as PollenKey] ?? 0 })
      return obj
    })

  // Current peak pollen
  const currentPoint = data.points[currentIdx]
  const peaks = activeLines.map(l => ({
    ...l,
    val: currentPoint[l.key as PollenKey],
  })).sort((a, b) => (b.val ?? 0) - (a.val ?? 0))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Pronóstico de Polen 5 Días</h3>

      {/* Current levels summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {peaks.filter(p => (p.val ?? 0) > 0).map(p => (
          <div key={p.key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400">{p.label}</span>
            <span className="font-medium" style={{ color: p.color }}>{pollenRisk(p.val)}</span>
          </div>
        ))}
        {peaks.every(p => (p.val ?? 0) === 0) && (
          <span className="text-xs text-slate-500">Sin polen significativo en este momento</span>
        )}
      </div>

      {/* Multi-line chart */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit' })}
              tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={7}
            />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
            <Tooltip content={<ChartTooltip />} />
            {activeLines.map(line => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.label}
                stroke={line.color}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-600">
        {activeLines.map(line => (
          <span key={line.key} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: line.color }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  )
}
