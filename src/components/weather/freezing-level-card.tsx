'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { FreezingLevelData } from '@/app/api/freezing-level/route'

const CAT_CONFIG = {
  very_low: { label: 'Muy bajo',  color: '#a855f7', desc: '< 500m' },
  low:      { label: 'Bajo',      color: '#38bdf8', desc: '500–1500m' },
  moderate: { label: 'Moderado',  color: '#22c55e', desc: '1500–2500m' },
  high:     { label: 'Alto',      color: '#eab308', desc: '2500–3500m' },
  very_high:{ label: 'Muy alto',  color: '#f97316', desc: '> 3500m' },
}

function zdaColor(m: number): string {
  if (m < 500)  return '#a855f7'
  if (m < 1500) return '#38bdf8'
  if (m < 2500) return '#22c55e'
  if (m < 3500) return '#eab308'
  return '#f97316'
}

export function FreezingLevelCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<FreezingLevelData>({
    queryKey: ['freezing-level', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/freezing-level?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  const cat = CAT_CONFIG[data.category]
  const color = zdaColor(data.currentZDA)

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    zda: h.zda,
    snow: h.snowLevel,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🏔️ Nivel de Congelación (ZDA)</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a',
        }}>
          {cat.label}
        </span>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">ZDA actual</div>
          <div className="text-2xl font-bold" style={{ color }}>{data.currentZDA >= 1000 ? `${(data.currentZDA / 1000).toFixed(1)}k` : data.currentZDA}</div>
          <div className="text-[9px] text-slate-500">metros</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">En pies</div>
          <div className="text-xl font-bold text-slate-300">{(data.currentZDAft / 1000).toFixed(1)}k</div>
          <div className="text-[9px] text-slate-500">ft</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Límite nieve</div>
          <div className="text-xl font-bold text-slate-300">~{data.snowLevelEstimate}</div>
          <div className="text-[9px] text-slate-500">m</div>
        </div>
      </div>

      {/* Range */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600">Mín 24h</div>
          <div className="text-sm font-semibold" style={{ color: zdaColor(data.minZDA24h) }}>{data.minZDA24h}m</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600">Máx 24h</div>
          <div className="text-sm font-semibold" style={{ color: zdaColor(data.maxZDA24h) }}>{data.maxZDA24h}m</div>
        </div>
      </div>

      {/* Significance */}
      <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-white/10 bg-white/5 text-slate-400">
        ℹ️ {data.significance}
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Nivel de congelación y límite de nieve — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="zdaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} unit="m" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}m`, name === 'zda' ? '❄️ ZDA' : '🌨️ Nieve']}
            />
            <Area type="monotone" dataKey="zda"  stroke={color}    fill="url(#zdaGrad)" strokeWidth={2} dot={false} name="zda" />
            <Area type="monotone" dataKey="snow" stroke="#a5b4fc"  fill="none"          strokeWidth={1} dot={false} name="snow" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 7-day mini */}
      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {data.days.slice(0, 7).map((d, i) => {
          const c = zdaColor((d.minZDA + d.maxZDA) / 2)
          return (
            <div key={i} className="text-center">
              <div className="text-[7px] text-slate-600">{d.label.slice(0, 3)}</div>
              <div className="mt-0.5 h-8 rounded flex flex-col items-center justify-center" style={{
                background: c + '18', border: `1px solid ${c}30`,
              }}>
                <span className="text-[7px] font-bold" style={{ color: c }}>{Math.round(d.maxZDA / 100) / 10}k</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
