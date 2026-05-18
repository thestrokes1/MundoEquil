'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { MicroclimateData } from '@/app/api/microclimate/route'

const UHI_CONFIG: Record<MicroclimateData['uhiCategory'], { label: string; color: string }> = {
  none:     { label: 'Sin isla de calor',     color: '#4ade80' },
  weak:     { label: 'Isla débil',            color: '#a3e635' },
  moderate: { label: 'Isla moderada',         color: '#eab308' },
  intense:  { label: 'Isla intensa',          color: '#f97316' },
  extreme:  { label: 'Isla extrema',          color: '#ef4444' },
}

export function MicroclimateCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<MicroclimateData>({
    queryKey: ['microclimate', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/microclimate?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
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

  const uhi = UHI_CONFIG[data.uhiCategory]
  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    uhi: h.uhi,
    temp: h.temp,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🏙️ Isla de Calor Urbano</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: uhi.color, borderColor: uhi.color + '44', background: uhi.color + '1a',
        }}>
          {uhi.label}
        </span>
      </div>

      {/* Temperature comparison */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl bg-white/5">
        <div className="flex-1 text-center">
          <div className="text-[9px] text-slate-600">Urbano (est.)</div>
          <div className="text-2xl font-bold text-orange-400">{data.urbanTemp}°</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-lg font-bold" style={{ color: uhi.color }}>+{data.uhi}°</div>
          <div className="text-[8px] text-slate-600">UHI</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-[9px] text-slate-600">Rural (obs.)</div>
          <div className="text-2xl font-bold text-slate-300">{data.ruralTemp}°</div>
        </div>
      </div>

      {/* Factors */}
      <div className="grid grid-cols-3 gap-1.5 mb-4 text-xs">
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">Viento</div>
          <div className="font-bold text-slate-300 capitalize">{data.windInfluence}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">HR</div>
          <div className="font-bold text-slate-300">{data.humidity}%</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">Sensación</div>
          <div className="font-bold text-slate-300">{data.feelsLike}°</div>
        </div>
      </div>

      {/* 48h UHI intensity */}
      <div className="text-[10px] text-slate-600 mb-1">Intensidad UHI — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <defs>
              <linearGradient id="uhiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={uhi.color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={uhi.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} unit="°" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}°C`, name === 'uhi' ? 'Offset UHI' : 'T rural']}
            />
            <Area type="monotone" dataKey="uhi" stroke={uhi.color} fill="url(#uhiGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="temp" stroke="#475569" fill="none" strokeWidth={1} dot={false} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Estimación UHI basada en patrón de viento, nubosidad y hora · No satelital
      </div>
    </div>
  )
}
