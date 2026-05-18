'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { SpotForecastData } from '@/app/api/spot-forecast/route'

export function SpotForecastCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<SpotForecastData>({
    queryKey: ['spot-forecast', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/spot-forecast?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-64 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const now = new Date().getHours()
  const currentHourIdx = data.hours.findIndex(h => parseInt(h.hour) >= now)
  const visibleHours = data.hours.slice(Math.max(0, currentHourIdx), Math.max(0, currentHourIdx) + 12)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">📋 Pronóstico por Horas</h3>
        <span className="text-[10px] text-slate-600">Spot forecast 24h</span>
      </div>

      {/* Summary prose */}
      {data.summary && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-sky-500/20 bg-sky-500/10 text-sky-300">
          {data.summary}
        </div>
      )}

      {/* Table header */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="text-slate-600 border-b border-white/5">
              <th className="text-left py-1.5 pr-2 font-medium">Hora</th>
              <th className="text-center py-1.5 px-1 font-medium">Cond.</th>
              <th className="text-right py-1.5 px-1 font-medium">°C</th>
              <th className="text-right py-1.5 px-1 font-medium">ST</th>
              <th className="text-right py-1.5 px-1 font-medium">HR%</th>
              <th className="text-right py-1.5 px-1 font-medium">Vto</th>
              <th className="text-right py-1.5 px-1 font-medium">Ráf</th>
              <th className="text-right py-1.5 px-1 font-medium">☁️%</th>
              <th className="text-right py-1.5 px-1 font-medium">mm</th>
              <th className="text-right py-1.5 pl-1 font-medium">UV</th>
            </tr>
          </thead>
          <tbody>
            {visibleHours.map((h, i) => {
              const isNow = i === 0
              const precipColor = h.precip > 5 ? '#f87171' : h.precip > 1 ? '#38bdf8' : h.precip > 0 ? '#7dd3fc' : '#475569'
              const uvColor = h.uvIndex >= 8 ? '#f97316' : h.uvIndex >= 6 ? '#eab308' : h.uvIndex >= 3 ? '#84cc16' : '#475569'
              return (
                <tr key={h.hour} className={`border-b border-white/5 ${isNow ? 'bg-sky-500/10' : 'hover:bg-white/3'}`}>
                  <td className={`py-1.5 pr-2 font-mono font-bold ${isNow ? 'text-sky-400' : 'text-slate-400'}`}>
                    {h.hour}{isNow && <span className="ml-1 text-[8px] text-sky-500">ahora</span>}
                  </td>
                  <td className="text-center py-1.5 px-1 text-base leading-none">{h.weatherIcon}</td>
                  <td className="text-right py-1.5 px-1 text-slate-200 font-semibold">{h.temp}°</td>
                  <td className="text-right py-1.5 px-1 text-slate-500">{h.feelsLike}°</td>
                  <td className="text-right py-1.5 px-1 text-slate-400">{h.humidity}%</td>
                  <td className="text-right py-1.5 px-1 text-slate-400">{h.wind}<span className="text-[8px] text-slate-600 ml-0.5">{h.windDirLabel}</span></td>
                  <td className="text-right py-1.5 px-1 text-slate-500">{h.gust}</td>
                  <td className="text-right py-1.5 px-1 text-slate-500">{h.cloud}</td>
                  <td className="text-right py-1.5 px-1 font-semibold" style={{ color: precipColor }}>{h.precip > 0 ? h.precip : '—'}</td>
                  <td className="text-right py-1.5 pl-1 font-semibold" style={{ color: uvColor }}>{h.uvIndex > 0 ? h.uvIndex : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 flex gap-4">
        <span>ST = Sensación térmica</span>
        <span>Vto = km/h</span>
        <span>Ráf = km/h</span>
      </div>
    </div>
  )
}
