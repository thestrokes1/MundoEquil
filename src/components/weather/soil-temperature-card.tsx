'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { SoilTemperatureData } from '@/app/api/soil-temperature/route'

const STATE_CONFIG = {
  frozen:  { label: 'Congelado',    color: '#a5b4fc' },
  cold:    { label: 'Frío',         color: '#38bdf8' },
  cool:    { label: 'Fresco',       color: '#34d399' },
  optimal: { label: 'Óptimo',       color: '#22c55e' },
  warm:    { label: 'Cálido',       color: '#fbbf24' },
  hot:     { label: 'Caliente',     color: '#f97316' },
}

function tempColor(t: number): string {
  if (t < 0)   return '#a5b4fc'
  if (t < 8)   return '#38bdf8'
  if (t < 12)  return '#34d399'
  if (t < 25)  return '#22c55e'
  if (t < 32)  return '#fbbf24'
  return '#f97316'
}

export function SoilTemperatureCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<SoilTemperatureData>({
    queryKey: ['soil-temperature', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/soil-temperature?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const cfg = STATE_CONFIG[data.soilState]

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    s0: h.surface,
    s6: h.depth6,
    s18: h.depth18,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌱 Temperatura del Suelo</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cfg.color, borderColor: cfg.color + '44', background: cfg.color + '1a',
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Depth layers */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Superficie', value: data.surface, depth: '0 cm' },
          { label: 'Capa 1',     value: data.depth6cm, depth: '6 cm' },
          { label: 'Capa 2',     value: data.depth18cm, depth: '18 cm' },
          { label: 'Capa 3',     value: data.depth54cm, depth: '54 cm' },
        ].map(({ label, value, depth }) => {
          const c = tempColor(value)
          return (
            <div key={depth} className="bg-white/5 rounded-2xl p-2.5 text-center">
              <div className="text-[8px] text-slate-600 mb-0.5">{depth}</div>
              <div className="text-xl font-bold" style={{ color: c }}>{value}°</div>
              <div className="text-[7px] text-slate-600">{label}</div>
            </div>
          )
        })}
      </div>

      {/* Frost depth */}
      {data.frostDepth !== null && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-blue-400/20 bg-blue-400/10 text-blue-300">
          ❄️ Helada en suelo hasta {data.frostDepth === 18 ? '18+ cm' : `${data.frostDepth} cm`} de profundidad
        </div>
      )}

      {/* Crop advice */}
      <div className="mb-4 px-3 py-2 rounded-xl text-xs border border-white/10 bg-white/5 text-slate-400">
        🌾 {data.cropAdvice}
      </div>

      {/* Soil profile visual */}
      <div className="mb-4 flex items-end gap-1 h-12 px-2">
        {[data.surface, data.depth6cm, data.depth18cm, data.depth54cm].map((t, i) => {
          const c = tempColor(t)
          const heights = ['100%', '85%', '70%', '55%']
          const labels = ['0cm', '6cm', '18cm', '54cm']
          return (
            <div key={i} className="flex flex-col items-center gap-0.5" style={{ width: '22%' }}>
              <div className="text-[7px] font-bold" style={{ color: c }}>{t}°</div>
              <div className="w-full rounded-t-sm" style={{ height: heights[i], background: c + '60', border: `1px solid ${c}40` }} />
              <div className="text-[6px] text-slate-700">{labels[i]}</div>
            </div>
          )
        })}
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Temperatura del suelo — 48h</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} unit="°" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}°C`, name === 's0' ? 'Superficie' : name === 's6' ? '6 cm' : '18 cm']}
            />
            <Line type="monotone" dataKey="s0"  stroke="#fbbf24" strokeWidth={2} dot={false} name="s0" />
            <Line type="monotone" dataKey="s6"  stroke="#84cc16" strokeWidth={1.5} dot={false} name="s6" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="s18" stroke="#38bdf8" strokeWidth={1.5} dot={false} name="s18" strokeDasharray="6 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 7-day */}
      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {data.days.map((d, i) => {
          const c = tempColor(d.avgSurface)
          return (
            <div key={i} className="text-center">
              <div className="text-[7px] text-slate-600">{d.label.slice(0, 3)}</div>
              <div className="mt-0.5 h-8 rounded flex flex-col items-center justify-center" style={{
                background: c + '18', border: `1px solid ${c}30`,
              }}>
                <span className="text-[8px] font-bold" style={{ color: c }}>{d.avgSurface}°</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
