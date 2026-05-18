'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { TornadoData } from '@/app/api/tornado/route'

const CAT_CONFIG: Record<TornadoData['category'], { label: string; color: string }> = {
  none:     { label: 'Sin riesgo',   color: '#4ade80' },
  low:      { label: 'Bajo',         color: '#a3e635' },
  moderate: { label: 'Moderado',     color: '#eab308' },
  high:     { label: 'Alto',         color: '#f97316' },
  extreme:  { label: 'Extremo',      color: '#ef4444' },
}

function ehiColor(ehi: number) {
  if (ehi >= 3) return '#ef4444'
  if (ehi >= 1.5) return '#f97316'
  if (ehi >= 0.5) return '#eab308'
  if (ehi >= 0.1) return '#a3e635'
  return '#4ade80'
}

export function TornadoRiskCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<TornadoData>({
    queryKey: ['tornado', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/tornado?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  const cat = CAT_CONFIG[data.category]
  const chartData = data.hours.filter((_, i) => i % 3 === 0).map(h => ({
    hour: h.hour,
    ehi: h.ehi,
    prob: h.tornadoProb,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌪️ Riesgo de Tornados</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a',
        }}>
          {cat.label}
        </span>
      </div>

      {/* EHI + STP display */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
        <div className="col-span-2 bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-0.5">EHI</div>
          <div className="text-2xl font-bold" style={{ color: ehiColor(data.currentEHI) }}>{data.currentEHI.toFixed(2)}</div>
          <div className="text-[9px] text-slate-600">Índice Energía-Helicidad</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-0.5">STP</div>
          <div className="font-bold text-lg text-slate-300">{data.currentSTP.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-0.5">CAPE</div>
          <div className="font-bold text-sm text-slate-300">{data.currentCape}</div>
          <div className="text-[9px] text-slate-600">J/kg</div>
        </div>
      </div>

      {/* EHI scale */}
      <div className="mb-3 text-[9px] text-slate-700 flex justify-between">
        <span>EHI &lt;0.5 bajo</span><span>0.5–1.5 moderado</span><span>1.5–3 alto</span><span>&gt;3 extremo</span>
      </div>

      {/* 48h EHI bars */}
      <div className="text-[10px] text-slate-600 mb-1">EHI por hora — 48h</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -28 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={7} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}`, 'EHI']}
            />
            <Bar dataKey="ehi" radius={[2, 2, 0, 0]} maxBarSize={14}>
              {chartData.map((d, i) => <Cell key={i} fill={ehiColor(d.ehi)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 3-day outlook */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {data.dailySummary.map((d, i) => {
          const c = ehiColor(d.maxEHI)
          return (
            <div key={i} className="rounded-xl bg-white/5 p-2 text-center">
              <div className="text-[9px] text-slate-600 capitalize mb-1">{d.label}</div>
              <div className="text-sm font-bold" style={{ color: c }}>EHI {d.maxEHI.toFixed(1)}</div>
              <div className="text-[9px] text-slate-600">STP {d.maxSTP.toFixed(2)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
