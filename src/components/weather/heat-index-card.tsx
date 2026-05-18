'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { HeatIndexData, HeatIndexCategory } from '@/app/api/heat-index/route'

const CAT_CONFIG: Record<HeatIndexCategory, { label: string; color: string }> = {
  comfortable:     { label: 'Confortable',         color: '#22c55e' },
  caution:         { label: 'Precaución',           color: '#eab308' },
  extreme_caution: { label: 'Precaución extrema',   color: '#f97316' },
  danger:          { label: 'Peligro',              color: '#ef4444' },
  extreme_danger:  { label: 'Peligro extremo',      color: '#7c3aed' },
}

export function HeatIndexCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<HeatIndexData>({
    queryKey: ['heat-index', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/heat-index?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const cat = CAT_CONFIG[data.category]
  const maxCat = CAT_CONFIG[data.maxCategory]

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    hi: h.heatIndex,
    temp: h.temp,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌡️ Índice de Calor</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a',
        }}>
          {cat.label}
        </span>
      </div>

      {/* Warning */}
      {data.warning && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-red-500/20 bg-red-500/10 text-red-300">
          ⚠️ {data.warning}
        </div>
      )}

      {/* Main metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Índice ahora</div>
          <div className="text-3xl font-bold" style={{ color: cat.color }}>{data.current}°</div>
          <div className="text-[9px] text-slate-500">°C</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Temp. real</div>
          <div className="text-2xl font-bold text-slate-200">{data.tempC}°</div>
          <div className="text-[9px] text-slate-500">°C</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Humedad</div>
          <div className="text-2xl font-bold text-slate-200">{data.humidity}%</div>
        </div>
      </div>

      {/* Max today */}
      <div className="mb-4 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
        <span className="text-sm">📈</span>
        <div className="flex-1">
          <div className="text-[9px] text-slate-600">Máximo hoy</div>
          <div className="text-sm font-semibold" style={{ color: maxCat.color }}>{data.maxToday}°C — {maxCat.label}</div>
        </div>
      </div>

      {/* Scale reference */}
      <div className="mb-3">
        <div className="flex justify-between text-[7px] text-slate-700 mb-0.5">
          <span>27 — Precaución</span><span>32 — P.extrema</span><span>41 — Peligro</span><span>54+ — Ext.</span>
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden" style={{
          background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7c3aed)',
        }}>
          <div className="absolute top-0 h-full w-0.5 bg-white rounded-full" style={{
            left: `${Math.min(98, Math.max(2, (data.current - 20) / 40 * 100))}%`,
          }} />
        </div>
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Índice de calor — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="hiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cat.color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={cat.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} unit="°" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}°C`, name === 'hi' ? 'Índ. calor' : 'Temp.']}
            />
            <ReferenceLine y={27} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={41} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Area type="monotone" dataKey="hi" stroke={cat.color} fill="url(#hiGrad)" strokeWidth={2} dot={false} name="hi" />
            <Area type="monotone" dataKey="temp" stroke="#94a3b8" fill="none" strokeWidth={1} dot={false} name="temp" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
