'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { ThunderstormProbData } from '@/app/api/thunderstorm-prob/route'

const RISK_CONFIG = {
  none:     { label: 'Sin riesgo',  color: '#475569' },
  low:      { label: 'Bajo',        color: '#84cc16' },
  moderate: { label: 'Moderado',    color: '#eab308' },
  high:     { label: 'Alto',        color: '#f97316' },
  extreme:  { label: 'Extremo',     color: '#ef4444' },
}

export function ThunderstormProbCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ThunderstormProbData>({
    queryKey: ['thunderstorm-prob', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/thunderstorm-prob?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const riskCfg = RISK_CONFIG[data.risk]

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    prob: h.prob,
    cape: Math.round(h.cape / 10),
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">⛈️ P(Tormenta) Detallada</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: riskCfg.color, borderColor: riskCfg.color + '44', background: riskCfg.color + '1a',
        }}>
          {riskCfg.label}
        </span>
      </div>

      {/* Main metric */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">P(storm) ahora</div>
          <div className="text-3xl font-bold" style={{ color: riskCfg.color }}>{data.currentProb}%</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Máx 24h</div>
          <div className="text-2xl font-bold" style={{ color: RISK_CONFIG[data.risk].color }}>{data.maxProb24h}%</div>
          {data.peakHour && <div className="text-[9px] text-slate-600">pico {data.peakHour}</div>}
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">CAPE</div>
          <div className="text-xl font-bold text-slate-200">{data.cape}</div>
          <div className="text-[9px] text-slate-500">J/kg</div>
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="text-[9px] text-slate-600">Índice de levantamiento</div>
          <div className="text-sm font-semibold" style={{ color: data.liftedIndex < -3 ? '#f87171' : data.liftedIndex < 0 ? '#f97316' : '#22c55e' }}>
            LI = {data.liftedIndex}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="text-[9px] text-slate-600">K-Index</div>
          <div className="text-sm font-semibold" style={{ color: data.kIndex >= 35 ? '#ef4444' : data.kIndex >= 25 ? '#f97316' : '#22c55e' }}>
            KI = {data.kIndex}
          </div>
        </div>
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">P(tormenta) — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="stormGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={riskCfg.color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={riskCfg.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 7, fill: '#475569' }} unit="%" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}${name === 'prob' ? '%' : '×10 J/kg'}`, name === 'prob' ? 'P(storm)' : 'CAPE']}
            />
            <ReferenceLine y={30} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={50} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Area type="monotone" dataKey="prob" stroke={riskCfg.color} fill="url(#stormGrad)" strokeWidth={2} dot={false} name="prob" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 7-day mini grid */}
      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {data.days.slice(0, 7).map((d, i) => (
          <div key={i} className="text-center">
            <div className="text-[7px] text-slate-600">{d.label.slice(0, 3)}</div>
            <div className="mt-0.5 h-8 rounded flex flex-col items-center justify-center" style={{
              background: d.color + '18', border: `1px solid ${d.color}30`,
            }}>
              <span className="text-[8px] font-bold" style={{ color: d.color }}>{d.maxProb}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
