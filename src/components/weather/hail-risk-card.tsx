'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { HailData } from '@/app/api/hail/route'

function hailColor(prob: number) {
  if (prob >= 70) return '#ef4444'
  if (prob >= 50) return '#f97316'
  if (prob >= 30) return '#eab308'
  if (prob >= 15) return '#84cc16'
  return '#4ade80'
}

function hailLabel(prob: number) {
  if (prob >= 70) return 'Riesgo severo'
  if (prob >= 50) return 'Riesgo alto'
  if (prob >= 30) return 'Riesgo moderado'
  if (prob >= 10) return 'Riesgo bajo'
  return 'Sin riesgo'
}

function sizeLabel(cm: number) {
  if (cm >= 5) return 'Pelota de béisbol'
  if (cm >= 3) return 'Pelota de golf'
  if (cm >= 2) return 'Moneda 2€'
  if (cm >= 1) return 'Canica'
  if (cm >= 0.5) return 'Guisante'
  return 'Mínimo'
}

export function HailRiskCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<HailData>({
    queryKey: ['hail', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/hail?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 1_800_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-40 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const color = hailColor(data.currentHailProb)
  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    prob: h.hailProb,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌨️ Riesgo de Granizo</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color, borderColor: color + '44', background: color + '1a',
        }}>
          {hailLabel(data.currentHailProb)}
        </span>
      </div>

      {/* Big current prob */}
      <div className="flex items-end gap-4 mb-4">
        <div>
          <div className="text-4xl font-bold" style={{ color }}>{data.currentHailProb}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">probabilidad actual</div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1.5 text-xs pb-1">
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-[9px] text-slate-600">CAPE</div>
            <div className="font-bold text-slate-300">{data.currentCape}</div>
            <div className="text-[9px] text-slate-600">J/kg</div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-[9px] text-slate-600">Cizalladura</div>
            <div className="font-bold text-slate-300">{data.currentShear}</div>
            <div className="text-[9px] text-slate-600">m/s</div>
          </div>
        </div>
      </div>

      {/* Max hail size indicator */}
      {data.maxHailSize > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-amber-500/20 bg-amber-500/10 text-amber-300">
          ⚠️ Tamaño máx. estimado: <span className="font-bold">{data.maxHailSize} cm</span> — {sizeLabel(data.maxHailSize)}
        </div>
      )}

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Probabilidad de granizo — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="hailGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} unit="%" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}%`, 'P(granizo)']}
            />
            <ReferenceLine y={30} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Area type="monotone" dataKey="prob" stroke={color} fill="url(#hailGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 3-day summary */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {data.dailySummary.map((d, i) => {
          const c = hailColor(d.maxProb)
          return (
            <div key={i} className="rounded-xl bg-white/5 p-2 text-center">
              <div className="text-[9px] text-slate-600 capitalize mb-1">{d.label}</div>
              <div className="text-sm font-bold" style={{ color: c }}>{d.maxProb}%</div>
              {d.maxSize > 0 && <div className="text-[9px]" style={{ color: c }}>{d.maxSize} cm</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
