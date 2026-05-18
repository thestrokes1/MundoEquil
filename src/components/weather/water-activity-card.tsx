'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { WaterActivityData, ActivityRating } from '@/app/api/water-activity/route'

function ScoreRow({ act }: { act: ActivityRating }) {
  const ratingLabel = act.rating === 'excellent' ? 'Excelente' : act.rating === 'good' ? 'Bueno' : act.rating === 'fair' ? 'Regular' : 'Malo'
  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-base">{act.emoji}</span>
        <span className="text-xs font-medium text-slate-300 flex-1">{act.name}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: act.color + '20', color: act.color }}>
          {ratingLabel}
        </span>
      </div>
      <div className="flex items-center gap-1.5 ml-6">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${act.score}%`, background: act.color }} />
        </div>
        <span className="text-[9px] font-bold w-6 text-right" style={{ color: act.color }}>{act.score}</span>
      </div>
      <div className="text-[9px] text-slate-600 mt-0.5 ml-6">{act.tip}</div>
    </div>
  )
}

export function WaterActivityCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<WaterActivityData>({
    queryKey: ['water-activity', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/water-activity?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  const activities = [data.surfing, data.kayaking, data.kitesurfing, data.openWaterSwim, data.paddleboard, data.sailing]

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    surf: h.surfing,
    kayak: h.kayaking,
    kite: h.kitesurfing,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌊 Actividades Acuáticas</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
          Mejor: {data.bestActivity}
        </span>
      </div>

      {/* Activity scores */}
      <div className="space-y-2.5 mb-4">
        {activities.map((act, i) => <ScoreRow key={i} act={act} />)}
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Índices acuáticos — 48h</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}/100`, name === 'surf' ? '🏄 Surf' : name === 'kayak' ? '🚣 Kayak' : '🪁 Kite']}
            />
            <Line type="monotone" dataKey="surf"  stroke="#38bdf8" strokeWidth={1.5} dot={false} name="surf" />
            <Line type="monotone" dataKey="kayak" stroke="#34d399" strokeWidth={1.5} dot={false} name="kayak" />
            <Line type="monotone" dataKey="kite"  stroke="#a78bfa" strokeWidth={1.5} dot={false} name="kite" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
