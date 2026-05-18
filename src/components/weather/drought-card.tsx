'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import type { DroughtData } from '@/app/api/drought/route'

const CAT_CONFIG: Record<DroughtData['category'], { label: string; color: string; desc: string }> = {
  extreme_wet:      { label: 'Muy húmedo',          color: '#38bdf8', desc: 'SPI ≥ +2.0' },
  wet:              { label: 'Húmedo',               color: '#4ade80', desc: 'SPI +1.0 a +2.0' },
  normal:           { label: 'Normal',               color: '#94a3b8', desc: 'SPI −0.5 a +1.0' },
  mild_drought:     { label: 'Sequía leve',          color: '#facc15', desc: 'SPI −1.0 a −0.5' },
  moderate_drought: { label: 'Sequía moderada',      color: '#fb923c', desc: 'SPI −1.5 a −1.0' },
  severe_drought:   { label: 'Sequía severa',        color: '#f87171', desc: 'SPI −2.0 a −1.5' },
  extreme_drought:  { label: 'Sequía extrema',       color: '#dc2626', desc: 'SPI < −2.0' },
}

export function DroughtCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<DroughtData>({
    queryKey: ['drought', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/drought?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  if (!data || 'error' in data) return null

  const cat = CAT_CONFIG[data.category]
  const spiNorm = Math.max(-3, Math.min(3, data.spi30))
  const spiPct = Math.round((spiNorm + 3) / 6 * 100)

  const chartData = data.months.map(m => ({
    mes: m.label,
    real: m.precip,
    normal: m.normal,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🏜️ Índice de Sequía (SPI)</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a',
        }}>
          {cat.label}
        </span>
      </div>

      {/* SPI gauge bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">SPI-30 días</span>
          <span className="font-bold" style={{ color: cat.color }}>{data.spi30 > 0 ? '+' : ''}{data.spi30}</span>
        </div>
        <div className="relative h-4 rounded-full overflow-hidden bg-white/10">
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, #dc2626, #f97316, #facc15, #94a3b8, #4ade80, #38bdf8)',
          }} />
          <div className="absolute inset-0 flex items-center" style={{ left: `${spiPct}%` }}>
            <div className="w-2 h-full bg-white rounded-full" style={{ marginLeft: -4 }} />
          </div>
        </div>
        <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
          <span>−3 Extremo</span><span>0 Normal</span><span>+3 Muy húmedo</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Lluvia 90d</div>
          <div className="font-bold text-slate-300">{data.recentPrecip} mm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Normal</div>
          <div className="font-bold text-slate-300">{data.normalPrecip} mm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Déficit P−ET₀</div>
          <div className="font-bold" style={{ color: data.waterBalance < 0 ? '#f87171' : '#4ade80' }}>
            {data.waterBalance > 0 ? '+' : ''}{data.waterBalance} mm
          </div>
        </div>
      </div>

      {/* Monthly comparison chart */}
      <div className="text-[10px] text-slate-600 mb-1">Precipitación mensual vs. normal (mm)</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 8, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v} mm`, name === 'real' ? 'Real' : 'Normal']}
            />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={0.5} />
            <Bar dataKey="normal" fill="#334155" radius={[2, 2, 0, 0]} maxBarSize={20} />
            <Bar dataKey="real" radius={[2, 2, 0, 0]} maxBarSize={20}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.real >= d.normal ? '#38bdf8' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        SPI calculado vs. promedio de 5 años · {cat.desc}
      </div>
    </div>
  )
}
