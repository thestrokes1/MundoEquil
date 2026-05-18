'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { WildlifeActivityData, WildlifeGroup } from '@/app/api/wildlife-activity/route'

function SpeciesRow({ sp }: { sp: WildlifeGroup }) {
  const label = sp.rating === 'excellent' ? 'Excelente' : sp.rating === 'good' ? 'Bueno' : sp.rating === 'fair' ? 'Regular' : 'Bajo'
  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-base">{sp.emoji}</span>
        <span className="text-xs font-medium text-slate-300 flex-1">{sp.name}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: sp.color + '20', color: sp.color }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 ml-6">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${sp.score}%`, background: sp.color }} />
        </div>
        <span className="text-[9px] font-bold w-6 text-right" style={{ color: sp.color }}>{sp.score}</span>
      </div>
      <div className="text-[9px] text-slate-600 mt-0.5 ml-6">{sp.tip}</div>
    </div>
  )
}

const MOON_LABEL = { high: 'Alta', moderate: 'Moderada', low: 'Baja' }
const MOON_COLOR = { high: '#fbbf24', moderate: '#94a3b8', low: '#475569' }

export function WildlifeActivityCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<WildlifeActivityData>({
    queryKey: ['wildlife-activity', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/wildlife-activity?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-56 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const catColor = { excellent: '#22c55e', good: '#84cc16', fair: '#eab308', poor: '#f87171' }[data.category]
  const catLabel = { excellent: 'Excelente', good: 'Buena', fair: 'Regular', poor: 'Baja' }[data.category]
  const moonColor = MOON_COLOR[data.moonInfluence]

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    activity: h.activity,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🦁 Actividad de Fauna</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: catColor, borderColor: catColor + '44', background: catColor + '1a',
        }}>
          {catLabel}
        </span>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Índice global</div>
          <div className="text-2xl font-bold" style={{ color: catColor }}>{data.overallIndex}</div>
          <div className="text-[9px] text-slate-500">/100</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Luna</div>
          <div className="text-[11px] font-semibold text-slate-300 mt-1">{data.moonPhase}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Influencia lunar</div>
          <div className="text-sm font-semibold mt-1" style={{ color: moonColor }}>{MOON_LABEL[data.moonInfluence]}</div>
        </div>
      </div>

      {/* Best period */}
      {data.bestPeriod && (
        <div className="mb-4 px-3 py-2 rounded-xl text-xs border border-green-500/20 bg-green-500/10 text-green-300">
          🕐 Mejor período de actividad hoy: {data.bestPeriod}
        </div>
      )}

      {/* Species scores */}
      <div className="space-y-2.5 mb-4">
        {data.species.map((sp, i) => <SpeciesRow key={i} sp={sp} />)}
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Índice de actividad fauna — 48h</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="wldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={catColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={catColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}/100`, 'Actividad']}
            />
            <Area type="monotone" dataKey="activity" stroke={catColor} fill="url(#wldGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
