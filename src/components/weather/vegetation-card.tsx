'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import type { VegetationData } from '@/app/api/vegetation/route'

const COND_CONFIG = {
  excellent: { label: 'Excelente',    color: '#22c55e' },
  good:      { label: 'Bueno',        color: '#84cc16' },
  fair:      { label: 'Regular',      color: '#eab308' },
  poor:      { label: 'Deficiente',   color: '#f97316' },
  dormant:   { label: 'Latencia',     color: '#94a3b8' },
}

function ndviColor(v: number) {
  if (v >= 0.65) return '#22c55e'
  if (v >= 0.45) return '#84cc16'
  if (v >= 0.25) return '#eab308'
  if (v >= 0.10) return '#f97316'
  return '#94a3b8'
}

export function VegetationCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<VegetationData>({
    queryKey: ['vegetation', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/vegetation?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
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

  if (!data || !data.months?.length) return null

  const cond = COND_CONFIG[data.months[data.currentMonth - 1]?.growingConditions ?? 'fair']
  const ndvi = data.currentNDVI
  const ndviPct = Math.round(ndvi * 100)

  const chartData = data.months.map(m => ({
    mes: m.label,
    ndvi: parseFloat((m.ndviProxy * 100).toFixed(0)),
    current: m.month === data.currentMonth,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌿 Vegetación y Fenología</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cond.color, borderColor: cond.color + '44', background: cond.color + '1a'
        }}>
          {cond.label}
        </span>
      </div>

      {/* NDVI gauge bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>NDVI estimado</span>
          <span className="font-bold" style={{ color: ndviColor(ndvi) }}>{ndvi.toFixed(2)} ({ndviPct}%)</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{
            width: `${ndviPct}%`,
            background: `linear-gradient(to right, #94a3b8, #eab308, #84cc16, #22c55e)`,
          }} />
        </div>
        <div className="flex justify-between text-[9px] text-slate-700 mt-0.5">
          <span>0 — Sin vegetación</span>
          <span>1.0 — Densa</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Estado</div>
          <div className="font-bold text-sm" style={{ color: cond.color }}>{data.growthStage}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Balance hídrico</div>
          <div className="font-bold text-lg" style={{ color: data.waterDeficit >= 0 ? '#38bdf8' : '#f87171' }}>
            {data.waterDeficit > 0 ? '+' : ''}{data.waterDeficit}
          </div>
          <div className="text-[9px] text-slate-600">mm (P − ET₀)</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Ciclo</div>
          <div className="font-bold text-sm text-slate-300 capitalize">{
            data.season === 'growing' ? '🌱 Crecimiento' :
            data.season === 'dormant' ? '❄️ Latencia' : '🍂 Transición'
          }</div>
        </div>
      </div>

      {/* Water deficit note */}
      {data.waterDeficit < -50 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-amber-500/20 bg-amber-500/10 text-amber-300">
          🌵 Déficit hídrico significativo — estrés en cultivos sin riego
        </div>
      )}

      {/* 12-month NDVI chart */}
      <div className="text-[10px] text-slate-600 mb-1">NDVI estimado por mes (12 meses recientes)</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 8, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}%`, 'NDVI estimado']}
            />
            <ReferenceLine y={45} stroke="#84cc16" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Bar dataKey="ndvi" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={ndviColor(d.ndvi / 100)} fillOpacity={d.current ? 1 : 0.6}
                  stroke={d.current ? '#fff' : 'none'} strokeWidth={d.current ? 1.5 : 0} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        NDVI proxy calculado a partir de precipitación, radiación solar y temperatura · ERA5/OMM
      </div>
    </div>
  )
}
