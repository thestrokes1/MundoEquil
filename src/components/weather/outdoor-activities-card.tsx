'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { OutdoorActivitiesData, ActivityScore } from '@/app/api/outdoor-activities/route'

const RATING_COLOR: Record<ActivityScore['rating'], string> = {
  excellent: '#22c55e',
  good:      '#84cc16',
  fair:      '#eab308',
  poor:      '#f87171',
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[9px] font-bold w-6 text-right" style={{ color }}>{score}</span>
    </div>
  )
}

export function OutdoorActivitiesCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<OutdoorActivitiesData>({
    queryKey: ['outdoor-activities', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/outdoor-activities?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const activities = [data.golf, data.hiking, data.gardening, data.cycling, data.photography]
  const bestActivity = activities.reduce((b, a) => a.score > b.score ? a : b, activities[0])
  const bestColor = RATING_COLOR[bestActivity.rating]

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    golf: h.golf,
    hiking: h.hiking,
    garden: h.gardening,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌿 Actividades al Aire Libre</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: bestColor, borderColor: bestColor + '44', background: bestColor + '1a',
        }}>
          Mejor: {data.bestActivityToday}
        </span>
      </div>

      {/* Activity scores */}
      <div className="space-y-2.5 mb-4">
        {activities.map((act, i) => {
          const c = RATING_COLOR[act.rating]
          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base">{act.emoji}</span>
                <span className="text-xs font-medium text-slate-300 flex-1">{act.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: c + '20', color: c }}>
                  {act.rating === 'excellent' ? 'Excelente' : act.rating === 'good' ? 'Bueno' : act.rating === 'fair' ? 'Regular' : 'Malo'}
                </span>
              </div>
              <ScoreBar score={act.score} color={c} />
              <div className="text-[9px] text-slate-600 mt-0.5 ml-6">{act.tips[0]}</div>
            </div>
          )
        })}
      </div>

      {/* Best window */}
      {data.bestTimeWindow && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-green-500/20 bg-green-500/10 text-green-300">
          🕐 Mejor ventana: {data.bestTimeWindow}
        </div>
      )}

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Índices horarios — 48h</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}/100`, `${name === 'golf' ? '⛳ Golf' : name === 'hiking' ? '🥾 Senderismo' : '🌻 Jardín'}`]}
            />
            <Line type="monotone" dataKey="golf" stroke="#22c55e" strokeWidth={1.5} dot={false} name="golf" />
            <Line type="monotone" dataKey="hiking" stroke="#38bdf8" strokeWidth={1.5} dot={false} name="hiking" />
            <Line type="monotone" dataKey="garden" stroke="#a3e635" strokeWidth={1.5} dot={false} name="garden" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
