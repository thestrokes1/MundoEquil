'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { WinterSportsData } from '@/app/api/winter-sports/route'

const QUALITY_CONFIG: Record<WinterSportsData['snowQuality'], { label: string; color: string; icon: string }> = {
  no_snow:  { label: 'Sin nieve',     color: '#64748b', icon: '🏔️' },
  powder:   { label: 'Polvo',         color: '#e2e8f0', icon: '❄️' },
  packed:   { label: 'Compactada',    color: '#93c5fd', icon: '🎿' },
  wet:      { label: 'Húmeda',        color: '#60a5fa', icon: '🌨️' },
  icy:      { label: 'Helada',        color: '#38bdf8', icon: '🧊' },
  slush:    { label: 'Aguanieve',     color: '#94a3b8', icon: '💧' },
}

function skiColor(idx: number) {
  if (idx >= 75) return '#22c55e'
  if (idx >= 50) return '#84cc16'
  if (idx >= 25) return '#eab308'
  if (idx >= 10) return '#f97316'
  return '#64748b'
}

export function WinterSportsCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<WinterSportsData>({
    queryKey: ['winter-sports', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/winter-sports?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const quality = QUALITY_CONFIG[data.snowQuality]
  const skiC = skiColor(data.skiIndex)
  const chartData = data.days.map(d => ({
    label: d.label.slice(0, 5),
    idx: d.skiIndex,
    snow: d.snowfallCm,
    q: d.quality,
  }))

  const noWinterConditions = data.snowDepthCm < 5

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">⛷️ Deportes de Invierno</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: quality.color, borderColor: quality.color + '44', background: quality.color + '1a',
        }}>
          {quality.icon} {quality.label}
        </span>
      </div>

      {noWinterConditions ? (
        <div className="mb-4 text-center py-4">
          <div className="text-3xl mb-2">🏔️</div>
          <div className="text-sm text-slate-400">Sin cobertura de nieve suficiente</div>
          <div className="text-[10px] text-slate-600 mt-1">Profundidad actual: {data.snowDepthCm} cm</div>
        </div>
      ) : (
        <>
          {/* Ski index + snow depth */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="col-span-2 bg-white/5 rounded-2xl p-3">
              <div className="text-[9px] text-slate-600 mb-1">Índice de ski</div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold" style={{ color: skiC }}>{data.skiIndex}</span>
                <span className="text-slate-500 text-xs mb-1">/100</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${data.skiIndex}%`, background: skiC }} />
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 text-center">
              <div className="text-[9px] text-slate-600 mb-1">Nieve</div>
              <div className="text-2xl font-bold text-slate-200">{data.snowDepthCm}</div>
              <div className="text-[9px] text-slate-600">cm</div>
            </div>
          </div>

          {/* Conditions */}
          <div className="grid grid-cols-3 gap-1.5 mb-3 text-xs">
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <div className="text-[8px] text-slate-600">T°</div>
              <div className="font-bold text-blue-400">{data.currentConditions.temp}°</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <div className="text-[8px] text-slate-600">Sensación</div>
              <div className="font-bold text-blue-300">{data.windChill}°</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <div className="text-[8px] text-slate-600">Viento</div>
              <div className="font-bold text-slate-300">{data.currentConditions.wind} km/h</div>
            </div>
          </div>
        </>
      )}

      <div className="px-3 py-2 rounded-xl text-xs border border-white/10 bg-white/5 text-slate-300 mb-3">
        {data.recommendation}
      </div>

      {/* 7-day ski index */}
      <div className="text-[10px] text-slate-600 mb-1">Índice de ski 7 días</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="label" tick={{ fontSize: 7, fill: '#475569' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}/100`, 'Índice ski']}
            />
            <Bar dataKey="idx" radius={[2, 2, 0, 0]} maxBarSize={22}>
              {chartData.map((d, i) => <Cell key={i} fill={skiColor(d.idx)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
