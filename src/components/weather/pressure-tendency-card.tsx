'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts'
import type { PressureTendencyData } from '@/app/api/pressure-tendency/route'

const RATE_CONFIG = {
  rapid_fall:  { label: 'Caída muy rápida', color: '#f87171', icon: '⬇⬇' },
  fall:        { label: 'Caída rápida',     color: '#fb923c', icon: '⬇' },
  slow_fall:   { label: 'Caída lenta',      color: '#facc15', icon: '↘' },
  steady:      { label: 'Estable',          color: '#4ade80', icon: '→' },
  slow_rise:   { label: 'Subida lenta',     color: '#a3e635', icon: '↗' },
  rise:        { label: 'Subida rápida',    color: '#38bdf8', icon: '⬆' },
  rapid_rise:  { label: 'Subida muy rápida',color: '#818cf8', icon: '⬆⬆' },
}

function BarometerSVG({ pressure, size = 80 }: { pressure: number; size: number }) {
  // Typical range 960–1050 hPa
  const min = 960, max = 1050
  const angle = ((pressure - min) / (max - min)) * 240 - 120  // -120° to +120°
  const clampedAngle = Math.max(-120, Math.min(120, angle))
  const rad = (clampedAngle - 90) * (Math.PI / 180)
  const cx = size / 2, cy = size / 2
  const needleLen = size * 0.35
  const nx = cx + needleLen * Math.cos(rad)
  const ny = cy + needleLen * Math.sin(rad)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background arc */}
      <circle cx={cx} cy={cy} r={size*0.42} fill="none" stroke="#1e293b" strokeWidth={size*0.06} />
      {/* Colored segments */}
      {[
        { start: -120, end: -40, color: '#60a5fa' },  // low pressure (rain)
        { start: -40, end: 40, color: '#4ade80' },     // normal
        { start: 40, end: 120, color: '#fbbf24' },     // high pressure (fair)
      ].map((seg, i) => {
        const startRad = (seg.start - 90) * (Math.PI / 180)
        const endRad = (seg.end - 90) * (Math.PI / 180)
        const r = size * 0.42
        const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad)
        const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad)
        const large = Math.abs(seg.end - seg.start) > 180 ? 1 : 0
        return (
          <path key={i}
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none" stroke={seg.color} strokeWidth={size*0.06} opacity={0.4}
          />
        )
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#f1f5f9" strokeWidth={size*0.025} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={size*0.06} fill="#334155" />
      {/* Pressure text */}
      <text x={cx} y={cy + size*0.25} textAnchor="middle" fill="#94a3b8" fontSize={size*0.13} fontWeight="600">
        {pressure.toFixed(0)}
      </text>
      <text x={cx} y={cy + size*0.36} textAnchor="middle" fill="#475569" fontSize={size*0.09}>
        hPa
      </text>
    </svg>
  )
}

export function PressureTendencyCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<PressureTendencyData>({
    queryKey: ['pressure-tendency', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/pressure-tendency?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 1_800_000,
    refetchInterval: 1_800_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data) return null

  const rate = RATE_CONFIG[data.changeRate]

  // 7-day chart: sample every 3h, past 2 days + 5 forecast days
  const chartData = data.points
    .filter((_, i) => i % 3 === 0)
    .map(p => ({
      time: p.time.slice(5, 13).replace('T', ' '),
      pressure: p.pressure,
    }))

  // Shade past vs forecast
  const splitIdx = chartData.findIndex(p => p.time >= new Date().toISOString().slice(5, 13).replace('T', ' '))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌀 Tendencia Barométrica</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: rate.color, borderColor: rate.color + '44', background: rate.color + '1a'
        }}>
          {rate.icon} {rate.label}
        </span>
      </div>

      {/* Barometer + stats */}
      <div className="flex items-center gap-4 mb-4">
        <BarometerSVG pressure={data.current} size={88} />
        <div className="flex-1 space-y-2 text-xs">
          <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2">
            <span className="text-slate-500">Cambio 3h</span>
            <span className="font-bold" style={{ color: data.tendency3h < 0 ? '#f87171' : data.tendency3h > 0 ? '#4ade80' : '#94a3b8' }}>
              {data.tendency3h > 0 ? '+' : ''}{data.tendency3h} hPa
            </span>
          </div>
          <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2">
            <span className="text-slate-500">Cambio 24h</span>
            <span className="font-bold" style={{ color: data.tendency24h < 0 ? '#f87171' : data.tendency24h > 0 ? '#4ade80' : '#94a3b8' }}>
              {data.tendency24h > 0 ? '+' : ''}{data.tendency24h} hPa
            </span>
          </div>
          <div className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2">
            <span className="text-slate-500">P(tormenta)</span>
            <span className="font-bold" style={{ color: data.stormProbability > 60 ? '#f87171' : data.stormProbability > 30 ? '#facc15' : '#4ade80' }}>
              {data.stormProbability}%
            </span>
          </div>
        </div>
      </div>

      {/* Forecast text */}
      <div className="mb-4 px-3 py-2.5 rounded-xl text-xs border" style={{
        borderColor: rate.color + '33', background: rate.color + '0d', color: rate.color
      }}>
        {data.forecast}
      </div>

      {/* 7-day pressure chart */}
      <div className="text-[10px] text-slate-600 mb-1">Presión superficial — 7 días (hPa)</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} interval={7} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v} hPa`, 'Presión']}
            />
            <ReferenceLine y={1013.25} stroke="#475569" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line type="monotone" dataKey="pressure" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Beaufort scale reference */}
      <div className="mt-3 grid grid-cols-3 gap-1 text-[9px]">
        <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-blue-400 inline-block" /><span className="text-slate-600">{'<'}1000 = borrascoso</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-green-400 inline-block" /><span className="text-slate-600">1013 = normal</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-400 inline-block" /><span className="text-slate-600">{'>'}1020 = anticiclón</span></div>
      </div>
    </div>
  )
}
