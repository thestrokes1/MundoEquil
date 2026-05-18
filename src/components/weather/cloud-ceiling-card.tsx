'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Cloud } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { CloudCeilingData } from '@/app/api/cloud-ceiling/route'

function LayerBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export function CloudCeilingCard() {
  const location = useLocationStore((s) => s.location)
  const { data, isLoading } = useQuery<CloudCeilingData>({
    queryKey: ['cloud-ceiling', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/cloud-ceiling?lat=${location!.lat}&lon=${location!.lon}`)
        .then(r => r.json()),
    enabled: !!location,
    staleTime: 1_800_000,
    refetchInterval: 1_800_000,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-16 bg-white/10 rounded-2xl" />
        <Skeleton className="h-24 bg-white/10 rounded-2xl" />
      </div>
    )
  }
  if (!data || 'error' in data || !data.hours?.length) return null

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    low: h.lowCloud,
    mid: h.midCloud,
    high: h.highCloud,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/50 to-blue-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <Cloud className="w-4 h-4 text-slate-300" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Techo nuboso</h3>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color: data.flightCategoryColor, backgroundColor: data.flightCategoryColor + '22' }}
        >
          {data.flightCategory}
        </span>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Ceiling */}
        <div className="flex items-center gap-4">
          <div className="text-2xl font-black text-slate-100">
            {data.ceiling ? `${data.ceiling} m` : '—'}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: data.flightCategoryColor }}>
              {data.flightCategoryLabel}
            </p>
            {data.ceilingFt && (
              <p className="text-[11px] text-slate-500">{data.ceilingFt.toLocaleString()} ft</p>
            )}
          </div>
        </div>

        {/* Cloud layers */}
        <div className="space-y-2">
          <LayerBar label="Nubes bajas  (0–2 km)"  pct={data.lowCloud}  color="#93c5fd" />
          <LayerBar label="Nubes medias (2–6 km)"  pct={data.midCloud}  color="#a5b4fc" />
          <LayerBar label="Nubes altas  (>6 km)"   pct={data.highCloud} color="#e9d5ff" />
        </div>

        {/* Altitudes */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-xl px-3 py-2">
            <p className="text-[10px] text-slate-500">Base convectiva (LCL)</p>
            <p className="text-sm font-bold text-slate-200">{data.lcl} m</p>
            <p className="text-[9px] text-slate-500">{data.lclFt.toLocaleString()} ft</p>
          </div>
          <div className="bg-white/5 rounded-xl px-3 py-2">
            <p className="text-[10px] text-slate-500">Nivel de cero °C</p>
            <p className="text-sm font-bold text-slate-200">{data.freezingLevel} m</p>
            <p className="text-[9px] text-slate-500">{data.freezingLevelFt.toLocaleString()} ft</p>
          </div>
        </div>

        {/* 48h cloud layer chart */}
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
              formatter={(v: unknown, n: unknown) => [
                `${v}%`,
                n === 'low' ? 'Baja' : n === 'mid' ? 'Media' : 'Alta',
              ]}
            />
            <Area type="monotone" dataKey="high" stackId="1" stroke="#e9d5ff" fill="#e9d5ff22" strokeWidth={1} />
            <Area type="monotone" dataKey="mid"  stackId="2" stroke="#a5b4fc" fill="#a5b4fc22" strokeWidth={1} />
            <Area type="monotone" dataKey="low"  stackId="3" stroke="#93c5fd" fill="#93c5fd33" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
