'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Flame } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { FireWeatherIndexData } from '@/app/api/fire-weather-index/route'

export function FireWeatherIndexCard() {
  const location = useLocationStore((s) => s.location)
  const { data, isLoading } = useQuery<FireWeatherIndexData>({
    queryKey: ['fire-weather-index', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/fire-weather-index?lat=${location!.lat}&lon=${location!.lon}`)
        .then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
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
  if (!data || 'error' in data || !data.days?.length) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">FWI — Índice Canadiense</h3>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* FWI big value */}
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-lg"
            style={{ backgroundColor: data.fwiColor + '25', border: `2px solid ${data.fwiColor}50` }}
          >
            <span className="text-xl font-black" style={{ color: data.fwiColor }}>{data.fwi}</span>
            <span className="text-[9px] text-slate-400">FWI</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: data.fwiColor }}>{data.fwiLabel}</p>
            <p className="text-xs text-slate-400 mt-0.5">{data.advice}</p>
          </div>
        </div>

        {/* Canadian indices */}
        <div className="grid grid-cols-5 gap-1 text-center">
          {[
            { label: 'FFMC', value: data.ffmc, desc: 'Humedad mantillo' },
            { label: 'DMC',  value: data.dmc,  desc: 'Mant. mediano' },
            { label: 'DC',   value: data.dc,   desc: 'Mant. profundo' },
            { label: 'ISI',  value: data.isi,  desc: 'Propagación' },
            { label: 'BUI',  value: data.bui,  desc: 'Combustible' },
          ].map(({ label, value, desc }) => (
            <div key={label} className="bg-white/5 rounded-lg p-1.5">
              <p className="text-[9px] text-slate-500 font-mono">{label}</p>
              <p className="text-sm font-bold text-slate-200">{value}</p>
              <p className="text-[8px] text-slate-600 leading-tight">{desc}</p>
            </div>
          ))}
        </div>

        {/* 7-day FWI bar chart */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">FWI 7 días</p>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={data.days} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 8, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => [`${v}`, 'FWI']}
              />
              <Bar dataKey="fwi" radius={[2, 2, 0, 0]}>
                {data.days.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conditions table */}
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {data.days.map(d => (
            <div key={d.label} className="space-y-0.5">
              <p className="text-[8px] text-slate-500 truncate">{d.label.split(' ')[0]}</p>
              <p className="text-[9px] font-bold" style={{ color: d.color }}>{d.fwi}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
