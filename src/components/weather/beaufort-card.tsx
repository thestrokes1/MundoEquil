'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { BeaufortData } from '@/app/api/beaufort/route'

const SCALE_LABELS = ['Calma','Ventolina','Flojito','Flojo','Bonancible','Fresquito','Fresco','Frescachón','Temporal','T. fuerte','T. muy fuerte','Borrasca','Huracán']

export function BeaufortCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<BeaufortData>({
    queryKey: ['beaufort', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/beaufort?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    scale: h.scale,
    color: h.color,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">💨 Escala Beaufort</h3>
        <span className="text-2xl font-black px-3 py-1 rounded-xl border" style={{
          color: data.color, borderColor: data.color + '44', background: data.color + '1a',
        }}>
          {data.currentScale}
        </span>
      </div>

      {/* Current */}
      <div className="mb-4 px-3 py-2.5 rounded-xl border" style={{
        borderColor: data.color + '30', background: data.color + '0d',
      }}>
        <div className="text-sm font-semibold" style={{ color: data.color }}>{data.currentDescription}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{data.landEffects}</div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600">Velocidad</div>
          <div className="text-xl font-bold text-slate-200">{data.windSpeed}</div>
          <div className="text-[9px] text-slate-500">km/h</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600">Ráfaga</div>
          <div className="text-xl font-bold text-slate-200">{data.windGust}</div>
          <div className="text-[9px] text-slate-500">km/h</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600">Máx. 24h</div>
          <div className="text-xl font-bold" style={{ color: data.color }}>BF {data.maxScale24h}</div>
        </div>
      </div>

      {/* Sea state */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="text-[9px] text-slate-600">Estado del mar</div>
          <div className="text-[10px] text-slate-300 mt-0.5">{data.seaState}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="text-[9px] text-slate-600">Altura de ola</div>
          <div className="text-[10px] text-slate-300 mt-0.5">{data.waveHeight}</div>
        </div>
      </div>

      {/* Beaufort scale bar */}
      <div className="mb-3">
        <div className="flex gap-0.5 h-3">
          {Array.from({ length: 13 }, (_, i) => {
            const colors = ['#22c55e','#84cc16','#a3e635','#facc15','#fbbf24','#f59e0b','#f97316','#ea580c','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d']
            const isCurrent = i === data.currentScale
            return (
              <div key={i} title={`BF ${i}: ${SCALE_LABELS[i]}`}
                className={`flex-1 rounded-sm ${isCurrent ? 'ring-1 ring-white' : ''}`}
                style={{ background: colors[i] + (isCurrent ? 'ff' : '60') }}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-[7px] text-slate-700 mt-0.5">
          <span>0</span><span>6</span><span>12</span>
        </div>
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Escala Beaufort — 48h</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -24 }} barSize={6}>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 12]} tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`BF ${v}`, 'Beaufort']}
            />
            <Bar dataKey="scale">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
