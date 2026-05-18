'use client'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { AgroData } from '@/app/api/agro/route'

interface TooltipProps {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-0.5">
      <div className="text-slate-400 mb-0.5">{time}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(1)}°C</div>
      ))}
    </div>
  )
}

export function AgroCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<AgroData>({
    queryKey: ['agro', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/agro?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  if (!data || !data.hourly?.time?.length) return null

  const now = new Date()
  const currentIdx = data.hourly.time.reduce((best, t, i) =>
    Math.abs(new Date(t).getTime() - now.getTime()) <
    Math.abs(new Date(data.hourly.time[best]).getTime() - now.getTime()) ? i : best
  , 0)

  const soilTemp0 = data.hourly.soilTemperature0cm[currentIdx]
  const soilTemp6 = data.hourly.soilTemperature6cm[currentIdx]
  const soilMoisture = data.hourly.soilMoisture[currentIdx]
  const vpd = data.hourly.vaporPressureDeficit[currentIdx]
  const leafWet = data.hourly.leafWetnessHours[currentIdx]
  const snowDepth = data.hourly.snowDepth[currentIdx]
  const freezingLevel = data.hourly.freezingLevelHeight[currentIdx]

  const isFrosty = soilTemp0 !== null && soilTemp0 < 2
  const hasFrostAlert = soilTemp0 !== null && soilTemp0 < 0

  // Find frost hours in next 24h
  const next24 = data.hourly.soilTemperature0cm.slice(currentIdx, currentIdx + 24)
  const frostHours = next24.filter(t => t !== null && t < 0).length

  const chartData = data.hourly.time
    .slice(Math.max(0, currentIdx - 6), currentIdx + 24)
    .map((t, i) => {
      const idx = Math.max(0, currentIdx - 6) + i
      return {
        time: t,
        'Suelo 0cm': data.hourly.soilTemperature0cm[idx],
        'Suelo 6cm': data.hourly.soilTemperature6cm[idx],
      }
    })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Datos Agrometeorológicos</h3>
        {hasFrostAlert ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300">
            ❄ Helada
          </span>
        ) : isFrosty ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
            Riesgo de helada
          </span>
        ) : (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300">
            Sin helada
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">T° suelo 0cm</div>
          <div className={`font-semibold ${soilTemp0 !== null && soilTemp0 < 0 ? 'text-blue-400' : soilTemp0 !== null && soilTemp0 < 3 ? 'text-cyan-400' : 'text-slate-200'}`}>
            {soilTemp0 !== null ? `${soilTemp0.toFixed(1)}°C` : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">T° suelo 6cm</div>
          <div className="text-slate-200 font-semibold">{soilTemp6 !== null ? `${soilTemp6.toFixed(1)}°C` : '—'}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Humedad suelo</div>
          <div className="text-slate-200 font-semibold">{soilMoisture !== null ? `${(soilMoisture * 100).toFixed(1)}%` : '—'}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">VPD</div>
          <div className="text-slate-200 font-semibold">{vpd !== null ? `${vpd.toFixed(2)} kPa` : '—'}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Horas hoja húmeda</div>
          <div className="text-slate-200 font-semibold">{leafWet !== null ? `${leafWet.toFixed(0)}%` : '—'}</div>
        </div>
        {snowDepth !== null && snowDepth > 0 ? (
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-slate-500 mb-1">Nieve</div>
            <div className="text-cyan-300 font-semibold">{(snowDepth * 100).toFixed(0)} cm</div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-slate-500 mb-1">Nivel cero</div>
            <div className="text-slate-200 font-semibold">{freezingLevel !== null ? `${Math.round(freezingLevel)} m` : '—'}</div>
          </div>
        )}
      </div>

      {frostHours > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
          ⚠ Se esperan <strong>{frostHours}h</strong> con temperatura bajo cero en las próximas 24h
        </div>
      )}

      {/* Soil temperature chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}°`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(147,197,253,0.4)" strokeDasharray="4 4" label={{ value: '0°', fill: '#7dd3fc', fontSize: 9 }} />
            <Line type="monotone" dataKey="Suelo 0cm" stroke="#f97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Suelo 6cm" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />0cm</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-400 inline-block" />6cm</span>
      </div>
    </div>
  )
}
