'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { FogData } from '@/app/api/fog/route'

function visLabel(m: number): string {
  if (m < 200) return 'Niebla densa'
  if (m < 500) return 'Niebla espesa'
  if (m < 1000) return 'Niebla moderada'
  if (m < 5000) return 'Niebla ligera'
  if (m < 10000) return 'Neblina'
  return 'Despejado'
}

function visColor(m: number): string {
  if (m < 200) return '#f87171'
  if (m < 500) return '#fb923c'
  if (m < 1000) return '#facc15'
  if (m < 5000) return '#a3e635'
  return '#4ade80'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function FogCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<FogData>({
    queryKey: ['fog', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/fog?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 1_800_000,
    refetchInterval: 1_800_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-40 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const current = data.hours[0]
  const color = visColor(current?.visibility ?? 10000)
  const label = visLabel(current?.visibility ?? 10000)

  const chartData = data.hours.slice(0, 48).map(h => ({
    time: h.time.slice(11, 16),
    prob: h.fogProbability,
    vis: Math.min(10, h.visibility / 1000),  // cap at 10km for chart
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌫 Niebla y Visibilidad</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color, borderColor: color + '44', background: color + '1a'
        }}>
          {label}
        </span>
      </div>

      {/* Current conditions */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">Visibilidad</div>
          <div className="font-bold text-lg" style={{ color }}>
            {current && current.visibility >= 10000
              ? '>10 km'
              : current
              ? `${(current.visibility / 1000).toFixed(1)} km`
              : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">P(niebla)</div>
          <div className="font-bold text-lg text-slate-200">{data.currentFogProb}%</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">Spread rocío</div>
          <div className="font-bold text-lg text-slate-200">
            {current ? `${(current.temperature - current.dewPoint).toFixed(1)}°` : '—'}
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">&lt;2° = riesgo</div>
        </div>
      </div>

      {/* Fog windows */}
      {data.fogWindowsToday.length > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-slate-400/20 bg-slate-400/10 text-slate-300">
          🌫 Ventanas de niebla hoy: {data.fogWindowsToday.map(w =>
            `${formatTime(w.start)}–${formatTime(w.end)}`
          ).join(', ')}
        </div>
      )}

      {/* Worst visibility alert */}
      {data.worstVisibility < 1000 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-amber-500/20 bg-amber-500/10 text-amber-300">
          ⚠ Peor visibilidad en 3 días: {(data.worstVisibility / 1000).toFixed(2)} km
        </div>
      )}

      {/* Fog probability + visibility chart */}
      <div className="text-[10px] text-slate-600 mb-1">P(niebla) % y visibilidad (km) — 48h</div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gfogprob" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [
                name === 'prob' ? `${v}%` : `${v} km`,
                name === 'prob' ? 'P(niebla)' : 'Visibilidad',
              ]}
            />
            <ReferenceLine y={40} stroke="#facc15" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Area type="monotone" dataKey="prob" stroke="#94a3b8" strokeWidth={1.5} fill="url(#gfogprob)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700">
        Niebla probable cuando P ≥ 40% · Calculado con spread de rocío, visibilidad y humedad
      </div>
    </div>
  )
}
