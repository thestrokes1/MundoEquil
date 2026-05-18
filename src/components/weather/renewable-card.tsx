'use client'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { RenewableData } from '@/app/api/renewable/route'

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function solarColor(kwh: number): string {
  if (kwh < 2)  return '#4ade80'
  if (kwh < 4)  return '#a3e635'
  if (kwh < 6)  return '#facc15'
  if (kwh < 8)  return '#fb923c'
  return '#f97316'
}

function windPotential(kmh: number | null): { pct: number; label: string; color: string } {
  if (kmh === null) return { pct: 0, label: '—', color: '#64748b' }
  // Typical cut-in: 10 km/h, rated: 50 km/h, cut-out: 90 km/h
  if (kmh < 10)  return { pct: 0,  label: 'Sin potencial', color: '#475569' }
  if (kmh < 20)  return { pct: 15, label: 'Mínimo',        color: '#4ade80' }
  if (kmh < 35)  return { pct: 40, label: 'Bajo',          color: '#a3e635' }
  if (kmh < 50)  return { pct: 70, label: 'Moderado',      color: '#facc15' }
  if (kmh < 70)  return { pct: 90, label: 'Alto',          color: '#fb923c' }
  return                 { pct: 100, label: 'Óptimo',       color: '#f97316' }
}

interface SolarTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function SolarTooltip({ active, payload, label }: SolarTooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{time}</div>
      <div className="text-amber-300">{(payload[0].value as number).toFixed(0)} W/m²</div>
    </div>
  )
}

export function RenewableCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<RenewableData>({
    queryKey: ['renewable', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/renewable?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || !Array.isArray(data.hourly) || data.hourly.length === 0) return null

  const now = new Date()
  const currentIdx = data.hourly.reduce((best, p, i) =>
    Math.abs(new Date(p.time).getTime() - now.getTime()) <
    Math.abs(new Date(data.hourly[best].time).getTime() - now.getTime()) ? i : best
  , 0)

  const current = data.hourly[currentIdx]
  const todayData = data.daily[0]
  const wind100 = windPotential(data.daily[0]?.windAvg100m ?? null)

  // Today's solar chart (current day ± 12h)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const solarChart = data.hourly
    .filter(p => {
      const t = new Date(p.time)
      return t >= todayStart && t <= todayEnd
    })
    .map(p => ({ time: p.time, radiation: p.solarRadiation ?? 0 }))

  // 7-day solar sum bar chart
  const weekChart = data.daily.map(d => {
    const date = new Date(d.date + 'T12:00:00')
    return {
      day: DAYS_ES[date.getDay()],
      solar: d.solarSum ?? 0,
    }
  })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">☀ Energía Renovable</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Radiación actual</div>
          <div className="text-amber-300 font-semibold">{current.solarRadiation?.toFixed(0) ?? '—'} W/m²</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">DNI actual</div>
          <div className="text-yellow-300 font-semibold">{current.directNormal?.toFixed(0) ?? '—'} W/m²</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Total hoy</div>
          <div className="text-amber-400 font-semibold">
            {todayData?.solarSum !== null && todayData?.solarSum !== undefined
              ? `${todayData.solarSum.toFixed(1)} kWh/m²`
              : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Potencial eólico</div>
          <div className="font-semibold" style={{ color: wind100.color }}>{wind100.label}</div>
        </div>
      </div>

      {/* Wind potential bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
          <span>Potencial eólico 100m</span>
          <span style={{ color: wind100.color }}>{data.daily[0]?.windAvg100m?.toFixed(0) ?? '—'} km/h</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${wind100.pct}%`, backgroundColor: wind100.color }}
          />
        </div>
      </div>

      {/* Today's solar irradiance curve */}
      {solarChart.length > 0 && (
        <>
          <div className="text-[10px] text-slate-600 mb-1">Irradiancia solar hoy (W/m²)</div>
          <div className="h-24 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={solarChart} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={3}
                />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<SolarTooltip />} />
                <Area type="monotone" dataKey="radiation" stroke="#fbbf24" strokeWidth={2} fill="url(#solarGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* 7-day solar sum bars */}
      {weekChart.length > 0 && (
        <>
          <div className="text-[10px] text-slate-600 mb-1">Energía solar acumulada 7 días (kWh/m²)</div>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekChart} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
                        <div className="text-amber-300">{label}: {(payload[0].value as number).toFixed(1)} kWh/m²</div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="solar" radius={[3, 3, 0, 0]} maxBarSize={18}>
                  {weekChart.map((entry, i) => (
                    <Cell key={i} fill={solarColor(entry.solar)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
