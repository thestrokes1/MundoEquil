'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { CloudRain } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { MonsoonData } from '@/app/api/monsoon/route'

export function MonsoonCard() {
  const location = useLocationStore((s) => s.location)
  const { data, isLoading } = useQuery<MonsoonData>({
    queryKey: ['monsoon', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/monsoon?lat=${location!.lat}&lon=${location!.lon}`)
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
        <Skeleton className="h-32 bg-white/10 rounded-2xl" />
      </div>
    )
  }
  if (!data || 'error' in data) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <CloudRain className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          {data.isMonsoonal ? 'Temporada de lluvias' : 'Estación de lluvias'}
        </h3>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Phase badge */}
        <div className="flex items-center gap-3">
          <div
            className="px-3 py-1.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: data.phaseColor + '40', border: `1.5px solid ${data.phaseColor}60` }}
          >
            <span style={{ color: data.phaseColor }}>{data.phaseLabel}</span>
          </div>
          {data.onset && (
            <span className="text-xs text-slate-400">
              {data.onset} → {data.withdrawal}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Hoy',          value: `${data.intensityMm} mm`,    sub: data.intensityLabel },
            { label: 'Semana',       value: `${data.weeklyPrecip} mm`,   sub: 'Próximos 7 días' },
            { label: 'Temporada',    value: `${data.seasonProgress}%`,   sub: 'Progreso' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white/5 rounded-xl p-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase">{label}</p>
              <p className="text-base font-bold text-slate-200">{value}</p>
              <p className="text-[10px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* Advice */}
        <p className="text-xs text-slate-400 bg-white/5 rounded-xl px-3 py-2">{data.advice}</p>

        {/* 10-day bar chart */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Precipitación diaria (mm)</p>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={data.dailyForecast} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 8, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => [`${v} mm`, 'Precip']}
              />
              <Bar dataKey="precip" radius={[3, 3, 0, 0]}>
                {data.dailyForecast.map((d, i) => (
                  <Cell key={i} fill={data.phaseColor} fillOpacity={d.precip > 0 ? 0.8 : 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
