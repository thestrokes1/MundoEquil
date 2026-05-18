'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { IcingData } from '@/app/api/icing/route'

function icingColor(prob: number) {
  if (prob >= 70) return '#ef4444'
  if (prob >= 50) return '#f97316'
  if (prob >= 30) return '#eab308'
  if (prob >= 15) return '#60a5fa'
  return '#4ade80'
}

function icingIntensity(prob: number) {
  if (prob >= 70) return 'Severo'
  if (prob >= 50) return 'Moderado-severo'
  if (prob >= 30) return 'Moderado'
  if (prob >= 10) return 'Ligero'
  return 'Trazas / Ninguno'
}

export function IcingCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<IcingData>({
    queryKey: ['icing', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/icing?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  const color = icingColor(data.currentIcingProb)
  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    prob: h.icingProb,
    temp: h.temp,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">✈️ Engelamiento en Vuelo</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color, borderColor: color + '44', background: color + '1a',
        }}>
          {icingIntensity(data.currentIcingProb)}
        </span>
      </div>

      {/* Current state */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Prob. actual</div>
          <div className="text-3xl font-bold" style={{ color }}>{data.currentIcingProb}%</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Tipo</div>
          <div className="text-sm font-bold text-slate-300">{data.currentIcingType}</div>
          {data.icingLayerBase > 0 && (
            <div className="text-[9px] text-slate-600 mt-1">{data.icingLayerBase}–{data.icingLayerTop} m</div>
          )}
        </div>
      </div>

      {data.severeHours > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-red-500/20 bg-red-500/10 text-red-300">
          ⚠️ {data.severeHours}h de engelamiento moderado-severo en las próximas 48h
        </div>
      )}

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Probabilidad de engelamiento — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="icingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} unit="%" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}%`, 'P(hielo)']}
            />
            <ReferenceLine y={30} stroke="#60a5fa" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Area type="monotone" dataKey="prob" stroke={color} fill="url(#icingGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Icing type scale */}
      <div className="mt-3 grid grid-cols-4 gap-1 text-center">
        {([['≥70%', '#ef4444', 'Severo'], ['50–70%', '#f97316', 'Mod-Sev'], ['30–50%', '#eab308', 'Mod'], ['<30%', '#60a5fa', 'Ligero']] as const).map(([pct, c, lbl]) => (
          <div key={lbl} className="rounded-lg p-1.5" style={{ background: c + '15', border: `1px solid ${c}33` }}>
            <div className="text-[8px] font-bold" style={{ color: c }}>{lbl}</div>
            <div className="text-[7px] text-slate-600">{pct}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Basado en T° en superficie, humedad y capa de nubes medias · Solo orientativo
      </div>
    </div>
  )
}
