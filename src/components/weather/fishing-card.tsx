'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { FishingData } from '@/app/api/fishing/route'

const RATING_CONFIG: Record<FishingData['todayRating'], { label: string; color: string; icon: string }> = {
  excellent: { label: 'Excelente', color: '#22c55e', icon: '🎣' },
  good:      { label: 'Buena',     color: '#84cc16', icon: '🐟' },
  fair:      { label: 'Regular',   color: '#eab308', icon: '🌊' },
  poor:      { label: 'Mala',      color: '#f87171', icon: '🌧️' },
}

function ratingColor(rating: FishingData['todayRating']) {
  return RATING_CONFIG[rating].color
}

function indexColor(idx: number) {
  if (idx >= 75) return '#22c55e'
  if (idx >= 50) return '#84cc16'
  if (idx >= 30) return '#eab308'
  return '#f87171'
}

export function FishingCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<FishingData>({
    queryKey: ['fishing', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/fishing?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const rating = RATING_CONFIG[data.todayRating]
  const idxColor = indexColor(data.todayIndex)
  const chartData = data.days.map(d => ({ label: d.label.slice(0, 5), idx: d.index, moon: d.moonPhase, rating: d.rating }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🎣 Índice de Pesca</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: rating.color, borderColor: rating.color + '44', background: rating.color + '1a',
        }}>
          {rating.icon} {rating.label}
        </span>
      </div>

      {/* Today index + factors */}
      <div className="flex gap-3 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center min-w-20">
          <div className="text-[9px] text-slate-600 mb-1">Hoy</div>
          <div className="text-3xl font-bold" style={{ color: idxColor }}>{data.todayIndex}</div>
          <div className="text-[9px] text-slate-500">/100</div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1.5 text-xs">
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-[8px] text-slate-600">Presión</div>
            <div className="font-bold text-slate-300 text-sm">{data.currentFactors.pressure}</div>
            <div className="text-[8px]" style={{ color: data.currentFactors.pressureChange > 0 ? '#4ade80' : '#f87171' }}>
              {data.currentFactors.pressureChange > 0 ? '↑' : '↓'} {Math.abs(data.currentFactors.pressureChange)} hPa
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-[8px] text-slate-600">Luna</div>
            <div className="font-bold text-slate-300 text-sm">{data.currentFactors.moonIllumination}%</div>
            <div className="text-[8px] text-slate-600">ilum.</div>
          </div>
        </div>
      </div>

      {/* Solunar periods */}
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2">
          <div className="text-[8px] text-green-400 font-semibold mb-1">🌟 Períodos mayores</div>
          {data.majorPeriods.map((p, i) => (
            <div key={i} className="text-[10px] text-slate-300">{p}</div>
          ))}
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2">
          <div className="text-[8px] text-blue-400 font-semibold mb-1">✨ Períodos menores</div>
          {data.minorPeriods.map((p, i) => (
            <div key={i} className="text-[10px] text-slate-300">{p}</div>
          ))}
        </div>
      </div>

      {/* 7-day index */}
      <div className="text-[10px] text-slate-600 mb-1">Índice de pesca 7 días</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="label" tick={{ fontSize: 7, fill: '#475569' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}/100`, 'Índice']}
            />
            <Bar dataKey="idx" radius={[2, 2, 0, 0]} maxBarSize={22}>
              {chartData.map((d, i) => <Cell key={i} fill={ratingColor(d.rating)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Moon phase row */}
      <div className="mt-2 flex justify-between">
        {chartData.map((d, i) => (
          <div key={i} className="text-center">
            <div className="text-base">{d.moon}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Presión barométrica · Fases lunares · Solunar · Temperatura del agua estimada
      </div>
    </div>
  )
}
