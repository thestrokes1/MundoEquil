'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { CropGrowthData } from '@/app/api/crop-growth/route'

function gddColor(pct: number) {
  if (pct >= 80) return '#22c55e'
  if (pct >= 60) return '#84cc16'
  if (pct >= 40) return '#eab308'
  if (pct >= 20) return '#fb923c'
  return '#64748b'
}

export function CropGrowthCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<CropGrowthData>({
    queryKey: ['crop-growth', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/crop-growth?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
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

  if (!data || 'error' in data) return null

  const chartData = data.forecast.map(d => ({
    label: d.label,
    corn: d.gddCorn,
    wheat: d.gddWheat,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌾 Grados de Crecimiento (GDD)</h3>
        {data.soilTemp !== null && (
          <span className="text-xs text-slate-500">Suelo: <span className="font-bold text-slate-300">{data.soilTemp}°C</span></span>
        )}
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-500 mb-1">🌽 Maíz</div>
          <div className="text-xl font-bold text-amber-400">{data.currentMonth.gddCorn}</div>
          <div className="text-[9px] text-slate-600">GDD este mes</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-500 mb-1">🌾 Trigo</div>
          <div className="text-xl font-bold text-yellow-300">{data.currentMonth.gddWheat}</div>
          <div className="text-[9px] text-slate-600">GDD este mes</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-500 mb-1">🫘 Soya</div>
          <div className="text-xl font-bold text-green-400">{data.currentMonth.gddSoy}</div>
          <div className="text-[9px] text-slate-600">GDD este mes</div>
        </div>
      </div>

      {/* Crop progress bars */}
      <div className="space-y-3 mb-4">
        {data.crops.map((crop, i) => {
          const c = gddColor(crop.progress)
          return (
            <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-300">{crop.emoji} {crop.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 italic">{crop.stage}</span>
                  <span className="text-[10px] font-bold" style={{ color: c }}>{crop.progress}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${crop.progress}%`,
                  background: c,
                }} />
              </div>
              <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
                <span>{crop.accumulated} GDD acum.</span>
                <span>Meta: {crop.target} GDD (Tb {crop.tBase}°C)</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 7-day GDD forecast */}
      <div className="text-[10px] text-slate-600 mb-1">GDD diario previsto — 7 días (Maíz / Trigo)</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="label" tick={{ fontSize: 7, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v} GDD`, name === 'corn' ? 'Maíz (Tb10)' : 'Trigo (Tb5)']}
            />
            <Bar dataKey="corn" fill="#fbbf24" fillOpacity={0.8} radius={[2, 2, 0, 0]} maxBarSize={16} />
            <Bar dataKey="wheat" fill="#84cc16" fillOpacity={0.8} radius={[2, 2, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        GDD acumulado desde el 1 de enero · {data.season.days} días · ERA5 + pronóstico Open-Meteo
      </div>
    </div>
  )
}
