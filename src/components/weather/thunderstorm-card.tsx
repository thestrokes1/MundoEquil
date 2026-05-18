'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend
} from 'recharts'
import type { ThunderstormData } from '@/app/api/thunderstorm/route'

const RISK = {
  none:     { label: 'Sin actividad',     color: '#4ade80', emoji: '☀️' },
  low:      { label: 'Actividad mínima',  color: '#a3e635', emoji: '🌤' },
  moderate: { label: 'Tormentas posibles',color: '#facc15', emoji: '⛈' },
  high:     { label: 'Tormentas probables',color: '#fb923c', emoji: '🌩' },
  extreme:  { label: 'Tormentas severas', color: '#f87171', emoji: '🌪' },
}

function capeColor(c: number) {
  if (c < 100) return '#4ade80'
  if (c < 500) return '#a3e635'
  if (c < 1500) return '#facc15'
  if (c < 2500) return '#fb923c'
  return '#f87171'
}

export function ThunderstormCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ThunderstormData>({
    queryKey: ['thunderstorm', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/thunderstorm?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 1_800_000,
    refetchInterval: 1_800_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data) return null

  const risk = RISK[data.currentRisk]

  // 48h view for chart
  const chartData = data.hours
    .filter(h => !h.time.endsWith('T12:00') || h.time <= new Date(Date.now() + 48 * 3600_000).toISOString().slice(0, 16))
    .slice(0, 48)
    .filter((_, i) => i % 3 === 0)
    .map(h => ({
      time: h.time.slice(8, 13),
      cape: h.cape,
      thunder: h.thunderProbability,
      li: h.liftedIndex,
    }))

  // 7-day risk summary (noon values only, beyond 48h)
  const cutoff = new Date(Date.now() + 48 * 3600_000).toISOString().slice(0, 16)
  const dailySummary = data.hours
    .filter(h => h.time > cutoff && h.time.endsWith('T12:00'))
    .slice(0, 5)
    .map(h => ({
      day: new Date(h.time).toLocaleDateString('es-MX', { weekday: 'short' }),
      risk: RISK[h.convectiveRisk],
      thunder: h.thunderProbability,
      cape: h.cape,
    }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">⚡ Actividad Convectiva</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: risk.color, borderColor: risk.color + '44', background: risk.color + '1a'
        }}>
          {risk.emoji} {risk.label}
        </span>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">CAPE</div>
          <div className="font-bold text-lg" style={{ color: capeColor(data.hours[0]?.cape ?? 0) }}>
            {data.hours[0]?.cape ?? 0}
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">J/kg</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">Índice lift.</div>
          <div className="font-bold text-lg text-slate-200">
            {data.hours[0]?.liftedIndex?.toFixed(1) ?? '—'}
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">K (&lt; −2 = inestable)</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">P(tormenta)</div>
          <div className="font-bold text-lg text-amber-400">
            {data.hours[0]?.thunderProbability ?? 0}%
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">próxima hora</div>
        </div>
      </div>

      {data.peakCape > 500 && (
        <div className="mb-4 px-3 py-2 rounded-xl text-xs border border-amber-500/20 bg-amber-500/10 text-amber-300">
          ⚡ Pico de inestabilidad: <strong>{data.peakCape} J/kg</strong> el {new Date(data.peakTime).toLocaleDateString('es-MX', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* 48h CAPE + thunder probability chart */}
      <div className="text-[10px] text-slate-600 mb-1">CAPE (J/kg) y P(tormenta) — 48h</div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} interval={3} />
            <YAxis yAxisId="left" tick={{ fontSize: 8, fill: '#475569' }} domain={[0, 'auto']} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8, fill: '#475569' }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [
                name === 'cape' ? `${v} J/kg` : `${v}%`,
                name === 'cape' ? 'CAPE' : 'P(tormenta)',
              ]}
            />
            <ReferenceLine yAxisId="left" y={1000} stroke="#facc15" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine yAxisId="left" y={2500} stroke="#f87171" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Bar yAxisId="left" dataKey="cape" radius={[2, 2, 0, 0]} maxBarSize={16}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={capeColor(d.cape)} fillOpacity={0.7} />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="thunder" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 5-day daily summary */}
      {dailySummary.length > 0 && (
        <div className="mt-4 space-y-1">
          <div className="text-[10px] text-slate-600 mb-2">Perspectiva 5 días</div>
          {dailySummary.map((d, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded-xl text-xs">
              <span className="text-slate-400 w-10 capitalize">{d.day}</span>
              <span className="flex-1 text-center" style={{ color: d.risk.color }}>{d.risk.emoji} {d.risk.label}</span>
              <span className="text-slate-500 text-[10px]">CAPE {d.cape} J/kg</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-[10px] text-slate-700 text-center">
        CAPE: Energía potencial convectiva disponible · LI: Índice de levantamiento
      </div>
    </div>
  )
}
