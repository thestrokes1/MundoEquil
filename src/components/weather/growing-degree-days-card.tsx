'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Sprout } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { GDDData } from '@/app/api/growing-degree-days/route'

export function GrowingDegreeDaysCard() {
  const location = useLocationStore((s) => s.location)
  const { data, isLoading } = useQuery<GDDData>({
    queryKey: ['gdd', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/growing-degree-days?lat=${location!.lat}&lon=${location!.lon}`)
        .then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
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
  if (!data || 'error' in data) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-lime-900/20 to-emerald-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <Sprout className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Días Grado de Crecimiento
        </h3>
        <span className="ml-auto text-xs text-slate-500">{data.season}</span>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Totals */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'GDD acum.',  value: `${data.accumulated}`, sub: `Base ${data.baseTemp}°C` },
            { label: 'Hoy',        value: `+${data.today}`,      sub: 'GDD/día' },
            { label: 'Semana',     value: `+${data.weekly}`,     sub: 'Próx. 7 días' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white/5 rounded-xl p-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase">{label}</p>
              <p className="text-base font-bold text-lime-400">{value}</p>
              <p className="text-[10px] text-slate-500">{sub}</p>
            </div>
          ))}
        </div>

        {/* Advice */}
        <p className="text-xs text-slate-400">{data.adviceGeneral}</p>

        {/* Crop stages */}
        <div className="space-y-2">
          {data.cropStages.map(c => (
            <div key={c.crop} className="bg-white/5 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200">{c.emoji} {c.crop}</span>
                <span className="text-[10px] text-slate-400">{c.currentStage}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-lime-500 transition-all"
                  style={{ width: `${c.progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-slate-500">→ {c.nextStage}</span>
                <span className="text-[9px] text-slate-500">{c.gddToNext > 0 ? `${c.gddToNext} GDD` : 'Completado'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Daily GDD chart */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">GDD últimos 7 días</p>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={data.days} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 8, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown, n: unknown) => [`${v}`, n === 'gdd' ? 'GDD/día' : 'Acumulado']}
              />
              <Bar dataKey="gdd" fill="#84cc16" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
