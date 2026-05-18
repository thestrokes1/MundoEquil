'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import type { HeatWaveData } from '@/app/api/heat-wave/route'

const CAT_CONFIG: Record<HeatWaveData['category'], { label: string; color: string; icon: string }> = {
  none:    { label: 'Sin ola de calor', color: '#4ade80',  icon: '✅' },
  watch:   { label: 'Vigilancia',       color: '#facc15',  icon: '👀' },
  warning: { label: 'Aviso',            color: '#fb923c',  icon: '⚠️' },
  extreme: { label: 'Extremo',          color: '#ef4444',  icon: '🔥' },
}

export function HeatWaveCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<HeatWaveData>({
    queryKey: ['heat-wave', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/heat-wave?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const cat = CAT_CONFIG[data.category]
  const chartData = data.days.map(d => ({
    label: d.label.slice(0, 5),
    max: d.tempMax,
    min: d.tempMin,
    isHeat: d.isHeatWaveDay,
    anomaly: d.anomaly,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌡️ Ola de Calor</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a',
        }}>
          {cat.icon} {cat.label}
        </span>
      </div>

      {/* Streak display */}
      {data.active ? (
        <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-red-400 font-semibold">Ola activa — {data.currentStreak} días consecutivos ≥35°C</div>
              {data.heatWaveStart && (
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Inicio: {new Date(data.heatWaveStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-red-400">{data.currentStreak}d</div>
          </div>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-[9px] text-slate-600 mb-0.5">Días ≥35°C</div>
            <div className="font-bold text-slate-300">{data.currentStreak}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-[9px] text-slate-600 mb-0.5">Noches &gt;20°C</div>
            <div className="font-bold text-slate-300">{data.nightsAbove20}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-[9px] text-slate-600 mb-0.5">T max récord</div>
            <div className="font-bold text-orange-400">{data.maxTemp}°</div>
          </div>
        </div>
      )}

      {/* Night heat */}
      {data.nightsAbove25 > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-orange-500/20 bg-orange-500/10 text-orange-300">
          🌙 {data.nightsAbove25} noche(s) tropical(es) &gt;25°C · Mínima media: {data.avgNightMin}°C
        </div>
      )}

      {/* 14-day chart */}
      <div className="text-[10px] text-slate-600 mb-1">Temperatura máxima/mínima — 14 días</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fontSize: 7, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} unit="°" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}°C`, name === 'max' ? 'Máx' : 'Mín']}
            />
            <ReferenceLine y={35} stroke="#f87171" strokeDasharray="3 3" strokeOpacity={0.6} />
            <Bar dataKey="max" radius={[2, 2, 0, 0]} maxBarSize={16}>
              {chartData.map((d, i) => <Cell key={i} fill={d.isHeat ? '#ef4444' : '#fb923c'} fillOpacity={d.isHeat ? 0.9 : 0.5} />)}
            </Bar>
            <Line type="monotone" dataKey="min" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Ola de calor: ≥35°C por ≥3 días consecutivos · Barras rojas = días en ola
      </div>
    </div>
  )
}
