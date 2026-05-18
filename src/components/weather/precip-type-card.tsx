'use client'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { PrecipTypeData } from '@/app/api/precip-type/route'

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  const items = payload.filter(p => (p.value as number) > 0)
  if (!items.length) return null
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-0.5">
      <div className="text-slate-400 mb-0.5">{time}</div>
      {items.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {(p.value as number).toFixed(1)} mm</div>
      ))}
    </div>
  )
}

export function PrecipTypeCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<PrecipTypeData>({
    queryKey: ['precip-type', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/precip-type?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || !Array.isArray(data.points) || data.points.length === 0) return null

  const now = new Date()
  const currentIdx = data.points.reduce((best, p, i) =>
    Math.abs(new Date(p.time).getTime() - now.getTime()) <
    Math.abs(new Date(data.points[best].time).getTime() - now.getTime()) ? i : best
  , 0)

  const next72 = data.points.slice(currentIdx, currentIdx + 72)
  const totalRain = next72.reduce((s, p) => s + (p.rain ?? 0) + (p.showers ?? 0), 0)
  const totalSnow = next72.reduce((s, p) => s + (p.snowfall ?? 0), 0)
  const hasPrecip = totalRain > 0 || totalSnow > 0

  const currentSnowDepth = data.points[currentIdx]?.snowDepth
  const hasSnowOnGround = currentSnowDepth !== null && currentSnowDepth !== undefined && currentSnowDepth > 0.01

  // Chart: every 3h for 72h
  const chartData = next72
    .filter((_, i) => i % 3 === 0)
    .map(p => ({
      time: p.time,
      'Lluvia': (p.rain ?? 0) + (p.showers ?? 0),
      'Nieve': (p.snowfall ?? 0) / 10, // cm to mm equivalent for display
    }))
    .filter(p => p['Lluvia'] + p['Nieve'] > 0.01)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Tipo de Precipitación</h3>
        {!hasPrecip && (
          <span className="text-xs px-2.5 py-1 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300">Sin lluvia 72h</span>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">💧 Lluvia 72h</div>
          <div className={`font-semibold ${totalRain > 10 ? 'text-blue-400' : totalRain > 0 ? 'text-sky-400' : 'text-slate-600'}`}>
            {totalRain.toFixed(1)} mm
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">❄ Nieve 72h</div>
          <div className={`font-semibold ${totalSnow > 0 ? 'text-blue-200' : 'text-slate-600'}`}>
            {totalSnow.toFixed(1)} cm
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">🏔 Nivel cero</div>
          <div className="text-slate-300 font-semibold">
            {data.points[currentIdx]?.freezingLevel !== null && data.points[currentIdx]?.freezingLevel !== undefined
              ? `${Math.round(data.points[currentIdx].freezingLevel!)} m`
              : '—'}
          </div>
        </div>
      </div>

      {hasSnowOnGround && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
          🌨 Nieve acumulada en suelo: <strong>{(currentSnowDepth * 100).toFixed(0)} cm</strong>
        </div>
      )}

      {!hasPrecip ? (
        <div className="text-center py-6 text-slate-600 text-xs">
          No se esperan precipitaciones en las próximas 72 horas
        </div>
      ) : (
        <>
          <div className="text-[10px] text-slate-600 mb-1">Precipitación por tipo — próximas 72h (mm)</div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis
                  dataKey="time"
                  tickFormatter={t => new Date(t).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit' })}
                  tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={3}
                />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Lluvia" stackId="p" fill="#38bdf8" radius={[0, 0, 0, 0]} maxBarSize={14} />
                <Bar dataKey="Nieve" stackId="p" fill="#e0e7ff" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" />Lluvia</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-200 inline-block" />Nieve (×10 cm→mm)</span>
          </div>
        </>
      )}
    </div>
  )
}
