'use client'
import { useQuery } from '@tanstack/react-query'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { PrecipAccumulationData } from '@/app/api/precip-accumulation/route'

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const d = label ? new Date(label + 'T12:00:00') : null
  const dateStr = d ? `${d.getDate()} ${MONTHS_ES[d.getMonth()]}` : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-0.5">
      <div className="text-slate-400 mb-0.5">{dateStr}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {(p.value as number).toFixed(1)} mm</div>
      ))}
    </div>
  )
}

export function PrecipAccumulationCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<PrecipAccumulationData>({
    queryKey: ['precip-accumulation', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/precip-accumulation?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || !data.thisMonth?.length) return null

  const now = new Date()
  const monthName = MONTHS_ES[now.getMonth()]
  const pct = data.comparedToAvg
  const isAbove = pct !== null && pct > 110
  const isBelow = pct !== null && pct < 75
  const statusLabel = pct === null ? 'Sin histórico' : isAbove ? `${pct}% del promedio — mes húmedo` : isBelow ? `${pct}% del promedio — mes seco` : `${pct}% del promedio — normal`
  const statusColor = isAbove ? '#38bdf8' : isBelow ? '#fb923c' : '#4ade80'

  const chartData = data.thisMonth.map(d => ({
    date: d.date,
    'Lluvia diaria': d.precip,
    'Acumulado': d.cumulative,
  }))

  // Pro-rate reference line for historical average
  const dailyAvg = data.monthlyAvgMm !== null ? data.monthlyAvgMm / data.thisMonth.length : null

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider capitalize">
          Lluvia de {monthName}
        </h3>
        <span className="text-xs font-medium px-2.5 py-1 rounded-xl border" style={{
          color: statusColor, borderColor: statusColor + '44', background: statusColor + '1a'
        }}>
          {pct !== null ? `${pct}%` : '—'}
        </span>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Acumulado mes</div>
          <div className="text-sky-300 font-bold text-lg leading-none">{data.yearToDateMm}<span className="text-xs font-normal text-slate-400 ml-1">mm</span></div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Prom. histórico</div>
          <div className="text-slate-300 font-semibold">{data.monthlyAvgMm ?? '—'} mm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Estado</div>
          <div className="text-[11px] font-medium leading-tight" style={{ color: statusColor }}>
            {isAbove ? 'Húmedo' : isBelow ? 'Seco' : pct !== null ? 'Normal' : '—'}
          </div>
        </div>
      </div>

      <div className="mb-3 px-3 py-1.5 rounded-xl bg-white/5 text-xs text-slate-400">
        {statusLabel}
      </div>

      {/* Chart: daily bars + cumulative line */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={d => {
                const date = new Date(d + 'T12:00:00')
                return `${date.getDate()}`
              }}
              tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={4}
            />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
            <Tooltip content={<ChartTooltip />} />
            {data.monthlyAvgMm !== null && dailyAvg !== null && (
              <ReferenceLine
                y={data.monthlyAvgMm}
                stroke={statusColor}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{ value: `prom. ${data.monthlyAvgMm}mm`, fill: statusColor, fontSize: 9, position: 'right' }}
              />
            )}
            <Bar dataKey="Lluvia diaria" fill="#38bdf8" fillOpacity={0.6} radius={[2, 2, 0, 0]} maxBarSize={12} />
            <Line type="monotone" dataKey="Acumulado" stroke="#38bdf8" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400/60 inline-block" />Diario</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-sky-400 rounded-full inline-block" />Acumulado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-px inline-block border-t border-dashed" style={{ borderColor: statusColor }} />Promedio hist.</span>
      </div>
    </div>
  )
}
