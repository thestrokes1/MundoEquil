'use client'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { SolarData } from '@/app/api/solar/route'

interface TooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-1">
      <div className="text-slate-400 mb-0.5">{time}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value} W/m²</div>
      ))}
    </div>
  )
}

function solarQuality(dnr: number): { label: string; color: string; desc: string } {
  if (dnr >= 700) return { label: 'Excelente', color: '#fbbf24', desc: 'Ideal para paneles solares' }
  if (dnr >= 400) return { label: 'Bueno', color: '#f59e0b', desc: 'Buena radiación solar' }
  if (dnr >= 150) return { label: 'Moderado', color: '#fb923c', desc: 'Radiación parcial' }
  if (dnr > 0) return { label: 'Bajo', color: '#94a3b8', desc: 'Nublado o amanecer/atardecer' }
  return { label: 'Noche', color: '#475569', desc: 'Sin radiación solar' }
}

export function SolarCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<SolarData>({
    queryKey: ['solar', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/solar?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-36 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || !data.hourly?.time?.length) return null

  const now = new Date()
  const currentIdx = data.hourly.time.reduce((best, t, i) => {
    return Math.abs(new Date(t).getTime() - now.getTime()) < Math.abs(new Date(data.hourly.time[best]).getTime() - now.getTime()) ? i : best
  }, 0)

  const currentDNI = data.hourly.directNormalIrradiance[currentIdx] ?? 0
  const currentSW = data.hourly.shortwaveRadiation[currentIdx] ?? 0
  const quality = solarQuality(currentDNI)

  const todayStats = data.daily.time[0] ? {
    sunshineDuration: data.daily.sunshineDuration[0] !== null ? Math.round((data.daily.sunshineDuration[0] ?? 0) / 3600 * 10) / 10 : null,
    radiationSum: data.daily.shortwaveRadiationSum[0] ?? null,
  } : null

  const chartData = data.hourly.time
    .map((t, i) => ({
      time: t,
      'Radiación global': Math.round(data.hourly.shortwaveRadiation[i] ?? 0),
      'Radiación directa': Math.round(data.hourly.directRadiation[i] ?? 0),
      'Difusa': Math.round(data.hourly.diffuseRadiation[i] ?? 0),
    }))
    .filter(p => {
      const idx = data.hourly.time.indexOf(p.time)
      return data.hourly.isDay[idx] === 1 || p['Radiación global'] > 0
    })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Radiación Solar</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300">
          {quality.label}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <div className="text-4xl font-bold tabular-nums" style={{ color: quality.color }}>
          {currentSW}
        </div>
        <div className="text-slate-400 text-sm mb-1">W/m² — {quality.desc}</div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">DNI actual</div>
          <div className="font-semibold" style={{ color: quality.color }}>{currentDNI} W/m²</div>
        </div>
        {todayStats && (
          <>
            <div className="bg-white/5 rounded-2xl p-3">
              <div className="text-slate-500 mb-1">Horas de sol</div>
              <div className="text-slate-200 font-semibold">{todayStats.sunshineDuration ?? '—'} h</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <div className="text-slate-500 mb-1">Energía hoy</div>
              <div className="text-slate-200 font-semibold">{todayStats.radiationSum !== null ? `${todayStats.radiationSum.toFixed(1)} MJ/m²` : '—'}</div>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="swGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="dirGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                tick={{ fill: '#475569', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Radiación global" stroke="#fbbf24" strokeWidth={2} fill="url(#swGrad)" dot={false} />
              <Area type="monotone" dataKey="Radiación directa" stroke="#f97316" strokeWidth={1.5} fill="url(#dirGrad)" dot={false} />
              <Area type="monotone" dataKey="Difusa" stroke="#94a3b8" strokeWidth={1} fill="none" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400/70 inline-block" />Global</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500/60 inline-block" />Directa</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400/40 inline-block" />Difusa</span>
      </div>
    </div>
  )
}
