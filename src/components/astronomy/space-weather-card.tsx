'use client'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { SpaceWeatherData } from '@/app/api/space-weather/route'

const STORM_COLORS: Record<number, string> = {
  0: '#4ade80',
  1: '#a3e635',
  2: '#facc15',
  3: '#fb923c',
  4: '#f87171',
  5: '#e879f9',
}

function kpColor(kp: number): string {
  if (kp < 4) return STORM_COLORS[0]
  if (kp < 5) return STORM_COLORS[1]
  if (kp < 6) return STORM_COLORS[2]
  if (kp < 7) return STORM_COLORS[3]
  if (kp < 8) return STORM_COLORS[4]
  return STORM_COLORS[5]
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const kp = payload[0].value
  const time = label ? new Date(label).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{time}</div>
      <div className="font-semibold" style={{ color: kpColor(kp) }}>Kp {kp.toFixed(1)}</div>
    </div>
  )
}

export function SpaceWeatherCard() {
  const { data, isLoading } = useQuery<SpaceWeatherData>({
    queryKey: ['space-weather'],
    queryFn: () => fetch('/api/space-weather').then(r => r.json()),
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || !('kpIndex' in data) || data.kpIndex === null) return null

  const stormColor = STORM_COLORS[data.geoStormLevel]
  const chartData = data.forecast.map(f => ({ time: f.time, kp: f.kp }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Clima Espacial</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{ color: stormColor, borderColor: stormColor + '44', background: stormColor + '1a' }}>
          {data.geoStormLabel}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <div className="text-4xl font-bold tabular-nums" style={{ color: stormColor }}>
          Kp {data.kpIndex.toFixed(1)}
        </div>
        {data.kpMax24h !== null && data.kpMax24h > data.kpIndex && (
          <div className="text-slate-400 text-sm mb-1">pico 24h: Kp {data.kpMax24h.toFixed(1)}</div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Flujo solar F10.7</div>
          <div className="text-slate-200 font-semibold">{data.solarFlux !== null ? `${data.solarFlux.toFixed(1)} sfu` : '—'}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Aurora visible desde</div>
          <div className="text-violet-300 font-semibold">{data.auroraLatitude !== null ? `${data.auroraLatitude}°N` : '—'}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Nivel tormenta geo.</div>
          <div className="font-semibold" style={{ color: stormColor }}>G{data.geoStormLevel}</div>
        </div>
      </div>

      {data.geoStormLevel >= 2 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border" style={{ background: stormColor + '15', borderColor: stormColor + '35', color: stormColor }}>
          ⚡ Posibles interferencias en GPS, comunicaciones por radio y redes eléctricas
        </div>
      )}

      {data.geoStormLevel >= 3 && data.auroraLatitude !== null && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300">
          🌌 Aurora boreal visible hasta {data.auroraLatitude}°N — potencialmente visible en latitudes medias
        </div>
      )}

      {chartData.length > 0 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="time"
                tickFormatter={t => new Date(t).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit' })}
                tick={{ fill: '#475569', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval={7}
              />
              <YAxis domain={[0, 9]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={4} stroke="rgba(251,146,60,0.3)" strokeDasharray="3 3" />
              <Bar dataKey="kp" radius={[3, 3, 0, 0]} maxBarSize={12}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={kpColor(entry.kp)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-600 text-center">
        Fuente: NOAA Space Weather Prediction Center
      </div>
    </div>
  )
}
