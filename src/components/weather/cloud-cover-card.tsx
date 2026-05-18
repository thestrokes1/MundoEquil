'use client'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { CloudCoverData } from '@/app/api/cloud-cover/route'

function cloudLabel(pct: number | null): string {
  if (pct === null) return '—'
  if (pct < 10) return 'Despejado'
  if (pct < 25) return 'Poc. nuboso'
  if (pct < 50) return 'Part. nuboso'
  if (pct < 75) return 'Muy nuboso'
  return 'Nublado'
}

function SkySVG({ low, mid, high, isDay }: { low: number; mid: number; high: number; isDay: number }) {
  const W = 120
  const H = 80
  const isDayBool = isDay === 1

  const skyColor = isDayBool
    ? (low > 60 ? '#374151' : low > 20 ? '#334155' : '#1e3a5f')
    : '#0f172a'

  const sunMoon = isDayBool
    ? <circle cx={W - 20} cy={20} r={12} fill="#fbbf24" opacity={Math.max(0.3, 1 - low / 100)} />
    : <circle cx={W - 20} cy={20} r={8} fill="#c7d2fe" opacity={Math.max(0.3, 1 - low / 100)} />

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="rounded-xl overflow-hidden">
      {/* Sky background */}
      <rect width={W} height={H} fill={skyColor} />

      {/* High clouds (cirrus) — very thin */}
      {high > 10 && (
        <rect x={0} y={0} width={W} height={H * 0.3}
          fill="white" fillOpacity={Math.min(high / 100 * 0.15, 0.15)} />
      )}
      {/* Mid clouds */}
      {mid > 10 && (
        <ellipse cx={W * 0.4} cy={H * 0.4} rx={W * 0.35 * mid / 100} ry={H * 0.12}
          fill="white" fillOpacity={Math.min(mid / 100 * 0.45, 0.45)} />
      )}
      {/* Low clouds */}
      {low > 10 && (
        <>
          <ellipse cx={W * 0.25} cy={H * 0.65} rx={W * 0.28 * low / 100} ry={H * 0.15}
            fill="white" fillOpacity={Math.min(low / 100 * 0.6, 0.7)} />
          <ellipse cx={W * 0.65} cy={H * 0.7} rx={W * 0.22 * low / 100} ry={H * 0.12}
            fill="white" fillOpacity={Math.min(low / 100 * 0.5, 0.6)} />
        </>
      )}
      {/* Sun/Moon */}
      {sunMoon}
    </svg>
  )
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-0.5">
      <div className="text-slate-400 mb-0.5">{time}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {(p.value as number).toFixed(0)}%</div>
      ))}
    </div>
  )
}

export function CloudCoverCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<CloudCoverData>({
    queryKey: ['cloud-cover', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/cloud-cover?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-36 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || !Array.isArray(data.points) || data.points.length === 0) return null

  const now = new Date()
  const currentIdx = data.points.reduce((best, p, i) =>
    Math.abs(new Date(p.time).getTime() - now.getTime()) <
    Math.abs(new Date(data.points[best].time).getTime() - now.getTime()) ? i : best
  , 0)

  const c = data.points[currentIdx]

  const chartData = data.points.map(p => ({
    time: p.time,
    'Alta': p.high,
    'Media': p.mid,
    'Baja': p.low,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Nubosidad</h3>
        <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-500/20 border border-white/10 text-slate-300">
          {cloudLabel(c.total)}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <SkySVG
          low={c.low ?? 0}
          mid={c.mid ?? 0}
          high={c.high ?? 0}
          isDay={c.isDay ?? 1}
        />
        <div className="flex-1 space-y-2 text-xs">
          {/* Layer bars */}
          {[
            { label: 'Alta (cirros)', value: c.high, color: '#e2e8f0' },
            { label: 'Media (altocu.)', value: c.mid, color: '#93c5fd' },
            { label: 'Baja (cumulus)', value: c.low, color: '#64748b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">{label}</span>
                <span style={{ color }}>{value ?? '—'}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, backgroundColor: color }} />
              </div>
            </div>
          ))}
          <div className="pt-1 border-t border-white/5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Total</span>
              <span className="text-slate-200 font-medium">{c.total ?? '—'}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 48h stacked cloud chart */}
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#e2e8f0" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="midGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#64748b" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={7}
            />
            <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="Alta" stroke="#e2e8f0" strokeWidth={1} fill="url(#highGrad)" dot={false} stackId="c" />
            <Area type="monotone" dataKey="Media" stroke="#93c5fd" strokeWidth={1} fill="url(#midGrad)" dot={false} stackId="c" />
            <Area type="monotone" dataKey="Baja" stroke="#64748b" strokeWidth={1.5} fill="url(#lowGrad)" dot={false} stackId="c" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200/60 inline-block" />Alta</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300/60 inline-block" />Media</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-500/60 inline-block" />Baja</span>
      </div>
    </div>
  )
}
