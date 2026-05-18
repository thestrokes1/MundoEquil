'use client'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { MarineData } from '@/app/api/marine/route'

function waveLabel(h: number | null): string {
  if (h === null) return '—'
  if (h < 0.1) return 'Calma'
  if (h < 0.5) return 'Rizado'
  if (h < 1.25) return 'Marejadilla'
  if (h < 2.5) return 'Marejada'
  if (h < 4) return 'Fuerte marejada'
  if (h < 6) return 'Gruesa'
  if (h < 9) return 'Muy gruesa'
  return 'Monstruosa'
}

function waveColor(h: number | null): string {
  if (h === null) return '#64748b'
  if (h < 0.5) return '#22d3ee'
  if (h < 1.25) return '#38bdf8'
  if (h < 2.5) return '#3b82f6'
  if (h < 4) return '#6366f1'
  return '#ec4899'
}

function compassDir(deg: number | null): string {
  if (deg === null) return '—'
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return dirs[Math.round(deg / 45) % 8]
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{time}</div>
      <div className="text-cyan-300 font-semibold">{payload[0].value.toFixed(2)} m</div>
    </div>
  )
}

export function MarineCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<MarineData>({
    queryKey: ['marine', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/marine?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-36 bg-white/10" />
        <Skeleton className="h-40 bg-white/10" />
      </div>
    )
  }

  if (!data || !data.current || data.current.waveHeight === null) return null

  const c = data.current
  const chartData = data.hourly.time
    .map((t, i) => ({ time: t, wave: data.hourly.waveHeight[i] }))
    .filter(p => p.wave !== null) as { time: string; wave: number }[]

  const color = waveColor(c.waveHeight)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Datos Marinos</h3>

      {/* Hero stat */}
      <div className="flex items-end gap-3 mb-4">
        <div className="text-4xl font-bold tabular-nums" style={{ color }}>
          {c.waveHeight?.toFixed(1) ?? '—'}
        </div>
        <div className="text-slate-400 text-sm mb-1">m — {waveLabel(c.waveHeight)}</div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Período ola</div>
          <div className="text-slate-200 font-semibold">{c.wavePeriod?.toFixed(1) ?? '—'} s</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Dirección</div>
          <div className="text-slate-200 font-semibold">{compassDir(c.waveDirection)} {c.waveDirection !== null ? `${Math.round(c.waveDirection)}°` : ''}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">T° superficie</div>
          <div className="text-slate-200 font-semibold">{c.seaSurfaceTemperature !== null ? `${c.seaSurfaceTemperature}°C` : '—'}</div>
        </div>
        {c.swellWaveHeight !== null && (
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-slate-500 mb-1">Swell</div>
            <div className="text-slate-200 font-semibold">{c.swellWaveHeight.toFixed(1)} m · {compassDir(c.swellWaveDirection)}</div>
          </div>
        )}
        {c.swellWavePeriod !== null && (
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-slate-500 mb-1">Período swell</div>
            <div className="text-slate-200 font-semibold">{c.swellWavePeriod.toFixed(1)} s</div>
          </div>
        )}
        {c.oceanCurrentVelocity !== null && (
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-slate-500 mb-1">Corriente</div>
            <div className="text-slate-200 font-semibold">{c.oceanCurrentVelocity.toFixed(1)} km/h · {compassDir(c.oceanCurrentDirection)}</div>
          </div>
        )}
      </div>

      {/* 48h wave height chart */}
      {chartData.length > 0 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                tick={{ fill: '#475569', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval={7}
              />
              <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}m`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="wave" stroke={color} strokeWidth={2} fill="url(#waveGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
