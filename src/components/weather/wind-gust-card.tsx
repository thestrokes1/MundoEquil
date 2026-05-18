'use client'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { WindGustData } from '@/app/api/wind-gust/route'

function WindRose({ directions }: { directions: number[] }) {
  const SIZE = 96
  const CX = SIZE / 2
  const CY = SIZE / 2
  const R = 34
  const SECTORS = 8
  const sectorAngle = 360 / SECTORS

  const counts = new Array(SECTORS).fill(0)
  directions.forEach(d => {
    const sector = Math.round(d / sectorAngle) % SECTORS
    counts[sector]++
  })
  const maxCount = Math.max(...counts, 1)

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {[R, R * 0.67, R * 0.33].map((r, i) => (
        <circle key={i} cx={CX} cy={CY} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      {counts.map((count, i) => {
        const angle = (i * sectorAngle - 90) * Math.PI / 180
        const barR = count > 0 ? (count / maxCount) * R : 4
        const x2 = CX + barR * Math.cos(angle)
        const y2 = CY + barR * Math.sin(angle)
        return (
          <line
            key={i} x1={CX} y1={CY} x2={x2} y2={y2}
            stroke="#38bdf8" strokeWidth={count > 0 ? 3.5 : 0.5}
            strokeOpacity={count > 0 ? 0.75 : 0.15} strokeLinecap="round"
          />
        )
      })}
      {dirs.map((dir, i) => {
        const angle = (i * sectorAngle - 90) * Math.PI / 180
        const lx = CX + (R + 8) * Math.cos(angle)
        const ly = CY + (R + 8) * Math.sin(angle) + 3
        return (
          <text key={dir} x={lx} y={ly} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize={7} fontFamily="system-ui">{dir}</text>
        )
      })}
      <circle cx={CX} cy={CY} r={2.5} fill="rgba(56,189,248,0.6)" />
    </svg>
  )
}

function beaufortLabel(kmh: number): string {
  if (kmh < 2)   return 'Calma'
  if (kmh < 12)  return 'Ventolina'
  if (kmh < 20)  return 'Brisa leve'
  if (kmh < 29)  return 'Brisa moderada'
  if (kmh < 39)  return 'Brisa fresca'
  if (kmh < 50)  return 'Brisa fuerte'
  if (kmh < 62)  return 'Viento fuerte'
  if (kmh < 75)  return 'Temporal'
  if (kmh < 89)  return 'Temporal fuerte'
  return 'Borrasca'
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
        <div key={p.name} style={{ color: p.color }}>{p.name}: {(p.value as number).toFixed(0)} km/h</div>
      ))}
    </div>
  )
}

export function WindGustCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<WindGustData>({
    queryKey: ['wind-gust', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/wind-gust?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  const current = data.points[currentIdx]
  const maxGust = Math.max(...data.points.map(p => p.gusts ?? 0))
  const directions = data.points.map(p => p.direction).filter((d): d is number => d !== null)

  const chartData = data.points.map(p => ({
    time: p.time,
    'Viento': p.speed,
    'Ráfagas': p.gusts,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Viento y Ráfagas</h3>
        <span className="text-xs px-2.5 py-1 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300">
          {current.speed !== null ? beaufortLabel(current.speed) : '—'}
        </span>
      </div>

      <div className="flex items-start gap-4 mb-4">
        <WindRose directions={directions} />
        <div className="flex-1 space-y-2 text-xs">
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-slate-500 mb-1">Velocidad</div>
            <div className="text-sky-300 font-bold text-2xl leading-none">
              {current.speed?.toFixed(0) ?? '—'}<span className="text-sm font-normal text-slate-400 ml-1">km/h</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-slate-500 mb-1">Ráfaga actual</div>
            <div className="text-orange-300 font-bold text-xl leading-none">
              {current.gusts?.toFixed(0) ?? '—'}<span className="text-sm font-normal text-slate-400 ml-1">km/h</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-slate-500 mb-1">Ráfaga máx. 48h</div>
            <div className="text-red-400 font-semibold">{maxGust.toFixed(0)} km/h</div>
          </div>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={7}
            />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="Viento" stroke="#38bdf8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Ráfagas" stroke="#fb923c" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-5 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-sky-400 rounded-full inline-block" />Viento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-orange-400 rounded-full inline-block" />Ráfagas
        </span>
        <span className="ml-auto text-slate-700">Rosa de vientos (48h)</span>
      </div>
    </div>
  )
}
