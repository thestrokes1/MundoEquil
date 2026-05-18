'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts'
import type { WinterData } from '@/app/api/winter/route'

function snowColor(cm: number) {
  if (cm < 1) return '#bfdbfe'
  if (cm < 5) return '#93c5fd'
  if (cm < 15) return '#60a5fa'
  if (cm < 30) return '#3b82f6'
  return '#1d4ed8'
}

function depthLabel(m: number) {
  if (m === 0) return 'Sin nieve'
  if (m < 0.05) return 'Nieve superficial'
  if (m < 0.20) return 'Nieve ligera'
  if (m < 0.50) return 'Nieve moderada'
  return 'Nieve profunda'
}

export function WinterCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<WinterData>({
    queryKey: ['winter', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/winter?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  // If no winter conditions at all, show minimal card
  if (!data.isWinterActive && data.freezingLevelNow > 4000) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">❄️ Nieve e Invierno</h3>
        <div className="text-xs text-slate-500 text-center py-6">
          Sin condiciones invernales en los próximos 7 días
          <div className="mt-1 text-[10px] text-slate-700">
            Nivel de cero: {data.freezingLevelNow.toLocaleString()} m s.n.m.
          </div>
        </div>
      </div>
    )
  }

  const chartData = data.hours.map(h => ({
    time: h.time.slice(5, 13).replace('T', ' '),
    nieve: h.snowfall,
    profundidad: parseFloat((h.snowDepth * 100).toFixed(1)), // in cm
    temp: h.temperature,
  }))

  const iceHours = data.hours.filter(h => h.iceRisk).length

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">❄️ Nieve e Invierno</h3>
        <span className="text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-xl">
          {depthLabel(data.currentSnowDepth)}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-blue-400 mb-1">Acumulación hoy</div>
          <div className="text-2xl font-bold text-blue-300">{data.accumulationToday.toFixed(1)}</div>
          <div className="text-[10px] text-blue-400/60">cm</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-blue-400 mb-1">Total 48h</div>
          <div className="text-2xl font-bold text-blue-300">{data.totalSnow48h.toFixed(1)}</div>
          <div className="text-[10px] text-blue-400/60">cm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Nieve en suelo</div>
          <div className="text-xl font-bold text-slate-200">{(data.currentSnowDepth * 100).toFixed(0)} cm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Nivel de cero</div>
          <div className="text-xl font-bold text-slate-200">{data.freezingLevelNow.toLocaleString()} m</div>
        </div>
      </div>

      {iceHours > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-sky-400/20 bg-sky-400/10 text-sky-300">
          🧊 Riesgo de hielo en {iceHours} hora{iceHours > 1 ? 's' : ''} de las próximas 48h
        </div>
      )}

      {/* Snowfall + depth chart */}
      <div className="text-[10px] text-slate-600 mb-1">Nevadas (cm) y profundidad acumulada — 8 días</div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} interval={7} />
            <YAxis yAxisId="snow" tick={{ fontSize: 8, fill: '#475569' }} />
            <YAxis yAxisId="depth" orientation="right" tick={{ fontSize: 8, fill: '#475569' }} unit="cm" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [
                `${v} cm`, name === 'nieve' ? 'Nevadas' : name === 'profundidad' ? 'Profundidad' : 'Temperatura'
              ]}
            />
            <ReferenceLine yAxisId="snow" y={0} stroke="#334155" />
            <Bar yAxisId="snow" dataKey="nieve" radius={[2, 2, 0, 0]} maxBarSize={14}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={snowColor(d.nieve)} fillOpacity={0.85} />
              ))}
            </Bar>
            <Line yAxisId="depth" type="monotone" dataKey="profundidad" stroke="#93c5fd" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-3 text-[9px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-400 inline-block" /> Nevadas (cm)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-px border-t border-dashed border-blue-300 inline-block" /> Profundidad (cm)</span>
      </div>
    </div>
  )
}
