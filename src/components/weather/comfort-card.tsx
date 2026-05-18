'use client'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { ComfortData } from '@/app/api/comfort/route'

function dewPointComfort(dp: number | null): { label: string; color: string } {
  if (dp === null) return { label: '—', color: '#64748b' }
  if (dp < 10)  return { label: 'Muy seco',   color: '#38bdf8' }
  if (dp < 13)  return { label: 'Seco',        color: '#4ade80' }
  if (dp < 16)  return { label: 'Confortable', color: '#86efac' }
  if (dp < 18)  return { label: 'Fresco',      color: '#facc15' }
  if (dp < 21)  return { label: 'Húmedo',      color: '#fb923c' }
  if (dp < 24)  return { label: 'Muy húmedo',  color: '#f87171' }
  return                { label: 'Sofocante',   color: '#e879f9' }
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-0.5">
      <div className="text-slate-400 mb-0.5">{time}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {(p.value as number).toFixed(1)}°C</div>
      ))}
    </div>
  )
}

export function ComfortCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ComfortData>({
    queryKey: ['comfort', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/comfort?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || !Array.isArray(data.points) || data.points.length === 0) return null

  const now = new Date()
  const currentIdx = data.points.reduce((best, p, i) =>
    Math.abs(new Date(p.time).getTime() - now.getTime()) <
    Math.abs(new Date(data.points[best].time).getTime() - now.getTime()) ? i : best
  , 0)

  const c = data.points[currentIdx]
  const comfort = dewPointComfort(c.dewPoint)

  const diff = c.apparentTemp !== null && c.temp !== null ? c.apparentTemp - c.temp : null
  const diffLabel = diff === null ? '' : diff > 1 ? `+${diff.toFixed(1)}°C (más caliente)` : diff < -1 ? `${diff.toFixed(1)}°C (más frío)` : 'Similar a la real'

  // Heat index: if temp > 27 and humidity > 40
  const heatIndex = c.temp !== null && c.humidity !== null && c.temp > 27 && c.humidity > 40
    ? c.temp - 0.55 * (1 - c.humidity / 100) * (c.temp - 14.5)
    : null

  // Wind chill: if temp < 10 and wind > 5 km/h
  const windChill = c.temp !== null && c.windSpeed !== null && c.temp < 10 && c.windSpeed > 5
    ? 13.12 + 0.6215 * c.temp - 11.37 * Math.pow(c.windSpeed, 0.16) + 0.3965 * c.temp * Math.pow(c.windSpeed, 0.16)
    : null

  const chartData = data.points.map(p => ({
    time: p.time,
    'Real': p.temp,
    'Sensación': p.apparentTemp,
    'Punto de rocío': p.dewPoint,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Confort Térmico</h3>
        <span className="text-xs font-medium px-2.5 py-1 rounded-xl border" style={{
          color: comfort.color, borderColor: comfort.color + '44', background: comfort.color + '1a'
        }}>
          {comfort.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Temperatura</div>
          <div className="text-slate-200 font-semibold">{c.temp?.toFixed(1) ?? '—'}°C</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Sensación</div>
          <div className="font-semibold" style={{ color: comfort.color }}>
            {c.apparentTemp?.toFixed(1) ?? '—'}°C
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Punto de rocío</div>
          <div className="text-slate-200 font-semibold">{c.dewPoint?.toFixed(1) ?? '—'}°C</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Humedad relativa</div>
          <div className="text-slate-200 font-semibold">{c.humidity ?? '—'}%</div>
        </div>
      </div>

      {diff !== null && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400">
          La sensación térmica es <span className="text-slate-200 font-medium">{diffLabel}</span>
        </div>
      )}

      {heatIndex !== null && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300">
          🌡 Índice de calor: <strong>{heatIndex.toFixed(1)}°C</strong> — riesgo de golpe de calor con actividad física
        </div>
      )}

      {windChill !== null && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300">
          🥶 Sensación de frío por viento: <strong>{windChill.toFixed(1)}°C</strong>
        </div>
      )}

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={7}
            />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}°`} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="rgba(147,197,253,0.2)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="Real" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="Sensación" stroke="#fb923c" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Punto de rocío" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 rounded-full inline-block" />Real</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 rounded-full inline-block" />Sensación</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-sky-400 rounded-full inline-block" />Pto. de rocío</span>
      </div>
    </div>
  )
}
