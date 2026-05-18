'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, BarChart, Bar } from 'recharts'
import type { SmokeData } from '@/app/api/smoke/route'

const CAT_LABELS = {
  good:               { label: 'Bueno',                color: '#4ade80' },
  moderate:           { label: 'Moderado',             color: '#facc15' },
  unhealthy_sensitive:{ label: 'No saludable (grupos sensibles)', color: '#fb923c' },
  unhealthy:          { label: 'No saludable',         color: '#f87171' },
  very_unhealthy:     { label: 'Muy no saludable',     color: '#c084fc' },
  hazardous:          { label: 'Peligroso',            color: '#9f1239' },
}

function pm25Color(v: number) {
  if (v <= 12)  return '#4ade80'
  if (v <= 35)  return '#facc15'
  if (v <= 55)  return '#fb923c'
  if (v <= 150) return '#f87171'
  if (v <= 250) return '#c084fc'
  return '#9f1239'
}

export function SmokeCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<SmokeData>({
    queryKey: ['smoke', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/smoke?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const cat = CAT_LABELS[data.currentCategory]
  const chartData = data.hours.map(h => ({
    time: h.time.slice(5, 13).replace('T', ' '),
    pm25: h.pm25,
    pm10: h.pm10,
    aod: parseFloat((h.aod * 100).toFixed(1)),
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🔥 Humo y Partículas</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a'
        }}>
          {cat.label}
        </span>
      </div>

      {data.smokeLikely && (
        <div className="mb-4 px-3 py-2.5 rounded-xl text-xs border border-amber-500/20 bg-amber-500/10 text-amber-300">
          🌫 Niveles elevados de partículas finas detectados — posible influencia de incendios
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">PM2.5 actual</div>
          <div className="font-bold text-xl" style={{ color: pm25Color(data.currentPm25) }}>
            {data.currentPm25}
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">µg/m³</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">Pico PM2.5</div>
          <div className="font-bold text-xl" style={{ color: pm25Color(data.peakPm25) }}>
            {data.peakPm25}
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">
            {data.peakTime ? new Date(data.peakTime).toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit' }) : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">AOD (humo)</div>
          <div className="font-bold text-xl text-slate-200">
            {data.hours[0]?.aod?.toFixed(2) ?? '—'}
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">&gt;0.5 = humo denso</div>
        </div>
      </div>

      {/* PM2.5 time series */}
      <div className="text-[10px] text-slate-600 mb-1">PM2.5 µg/m³ — 5 días</div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} interval={7} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v} µg/m³`, name === 'pm25' ? 'PM2.5' : 'PM10']}
            />
            <ReferenceLine y={12} stroke="#4ade80" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={35} stroke="#facc15" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={55} stroke="#fb923c" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Bar dataKey="pm25" radius={[2, 2, 0, 0]} maxBarSize={12}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={pm25Color(d.pm25)} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* EPA breakpoints reference */}
      <div className="mt-3 grid grid-cols-3 gap-1 text-[9px]">
        {Object.entries(CAT_LABELS).map(([, v]) => (
          <div key={v.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.color }} />
            <span className="text-slate-600 truncate">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
