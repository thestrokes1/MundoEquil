'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { SoilData } from '@/app/api/soil/route'

const RISK_CONFIG = {
  none:     { label: 'Sin estrés hídrico', color: '#4ade80' },
  low:      { label: 'Estrés bajo',        color: '#a3e635' },
  moderate: { label: 'Estrés moderado',    color: '#facc15' },
  severe:   { label: 'Estrés severo',      color: '#fb923c' },
  extreme:  { label: 'Sequía extrema',     color: '#f87171' },
}

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`
}

function MoistureGauge({ value, label, fieldCap = 0.30, wiltPt = 0.10 }: {
  value: number; label: string; fieldCap?: number; wiltPt?: number
}) {
  const w = Math.min(100, (value / 0.5) * 100)
  const fcW = (fieldCap / 0.5) * 100
  const wpW = (wiltPt / 0.5) * 100
  const color = value < wiltPt ? '#f87171' : value < fieldCap * 0.6 ? '#facc15' : '#4ade80'

  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-medium" style={{ color }}>{pct(value)}</span>
      </div>
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
        <div className="absolute top-0 bottom-0 w-px bg-sky-400/60" style={{ left: `${fcW}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-red-400/60" style={{ left: `${wpW}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-slate-700 mt-0.5">
        <span>Seco</span>
        <span className="text-red-400/60" style={{ marginLeft: `${wpW - 8}%` }}>Marchitez</span>
        <span className="text-sky-400/60">C. campo</span>
      </div>
    </div>
  )
}

export function SoilCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<SoilData>({
    queryKey: ['soil', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/soil?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-40 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data) return null

  const risk = RISK_CONFIG[data.droughtRisk]

  const chartData = data.points.map(p => ({
    time: p.time.slice(5, 13).replace('T', ' '),
    superficial: parseFloat((p.soilMoist0 * 100).toFixed(1)),
    profunda: parseFloat((p.soilMoist9 * 100).toFixed(1)),
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌱 Humedad del Suelo</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: risk.color, borderColor: risk.color + '44', background: risk.color + '1a'
        }}>
          {risk.label}
        </span>
      </div>

      {/* Moisture gauges */}
      <div className="space-y-3 mb-4">
        <MoistureGauge value={data.avgMoist0} label="Superficial (0–1 cm)" />
        <MoistureGauge value={data.avgMoist9} label="Profunda (9–27 cm)" />
      </div>

      {/* Drought score */}
      <div className="mb-4 bg-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium">Índice de sequía</div>
          <div className="text-[10px] text-slate-600 mt-0.5">0 = sin estrés, 100 = sequía extrema</div>
        </div>
        <div className="text-3xl font-bold" style={{ color: risk.color }}>{data.droughtScore}</div>
      </div>

      {/* Time series chart */}
      <div className="text-[10px] text-slate-600 mb-1">Evolución de humedad (%)</div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gsm0" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gsm9" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} interval={7} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} domain={[0, 50]} unit="%" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}%`, name === 'superficial' ? 'Superficial' : 'Profunda']}
            />
            <ReferenceLine y={30} stroke="#38bdf8" strokeDasharray="4 4" strokeOpacity={0.4} />
            <ReferenceLine y={10} stroke="#f87171" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Area type="monotone" dataKey="profunda" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gsm9)" dot={false} />
            <Area type="monotone" dataKey="superficial" stroke="#38bdf8" strokeWidth={1.5} fill="url(#gsm0)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3 mt-2 text-[9px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-sky-400 inline-block" /> Superficial (0–1 cm)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-violet-400 inline-block" /> Profunda (9–27 cm)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-px bg-sky-400/50 border-dashed inline-block" /> Capacidad de campo</span>
      </div>
    </div>
  )
}
