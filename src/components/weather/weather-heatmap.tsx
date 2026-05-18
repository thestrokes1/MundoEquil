'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExtendedHourlyPoint } from '@/app/api/hourly-extended/route'

function tempToColor(temp: number, min: number, max: number): string {
  const range = max - min || 1
  const normalized = (temp - min) / range
  // Cold → hot: blue → cyan → green → yellow → orange → red
  const stops = [
    [96, 165, 250],   // blue-400
    [34, 211, 238],   // cyan-400
    [74, 222, 128],   // green-400
    [250, 204, 21],   // yellow-400
    [251, 146, 60],   // orange-400
    [248, 113, 113],  // red-400
  ]
  const idx = normalized * (stops.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, stops.length - 1)
  const t = idx - lo
  const r = Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * t)
  const g = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * t)
  const b = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * t)
  return `rgb(${r},${g},${b})`
}

function precipOpacity(prob: number): number {
  return prob / 100
}

const HOURS_TO_SHOW = [0, 3, 6, 9, 12, 15, 18, 21]

export function WeatherHeatmap() {
  const location = useLocationStore(s => s.location)
  const { unit } = useLocationStore()

  const { data, isLoading } = useQuery<ExtendedHourlyPoint[]>({
    queryKey: ['hourly-extended', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/hourly-extended?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!Array.isArray(data) || data.length === 0) return null

  const convert = (c: number) => unit === 'fahrenheit' ? Math.round(c * 9 / 5 + 32) : Math.round(c)

  const temps = data.map(p => p.temperature)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)

  // Group by day × hour
  const days: Map<string, Map<number, ExtendedHourlyPoint>> = new Map()
  for (const p of data) {
    const d = new Date(p.time)
    const dayKey = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
    const hour = d.getHours()
    if (!days.has(dayKey)) days.set(dayKey, new Map())
    days.get(dayKey)!.set(hour, p)
  }

  const dayEntries = [...days.entries()].slice(0, 7)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Mapa de calor — Temperatura 7 días</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <span className="w-16 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #60a5fa, #22d3ee, #4ade80, #facc15, #fb923c, #f87171)' }} />
          <span>frío → calor</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr>
              <th className="text-left pr-2 text-slate-600 font-medium pb-2 min-w-[48px]">Día</th>
              {HOURS_TO_SHOW.map(h => (
                <th key={h} className="text-center text-slate-600 font-medium pb-2 px-0.5">{String(h).padStart(2, '0')}h</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayEntries.map(([day, hours]) => (
              <tr key={day}>
                <td className="text-slate-500 pr-2 capitalize py-0.5 whitespace-nowrap">{day}</td>
                {HOURS_TO_SHOW.map(h => {
                  const p = hours.get(h)
                  if (!p) return <td key={h} className="px-0.5 py-0.5" />
                  const bg = tempToColor(p.temperature, minTemp, maxTemp)
                  const rainOverlay = precipOpacity(p.precipitationProbability)
                  return (
                    <td key={h} className="px-0.5 py-0.5">
                      <div
                        className="w-9 h-7 rounded-md flex items-center justify-center cursor-default transition-transform hover:scale-110 relative overflow-hidden"
                        style={{ background: bg }}
                        title={`${day} ${String(h).padStart(2, '0')}:00 — ${convert(p.temperature)}° — Lluvia: ${p.precipitationProbability}%`}
                      >
                        {rainOverlay > 0.2 && (
                          <div
                            className="absolute inset-0 rounded-md"
                            style={{ background: `rgba(96,165,250,${rainOverlay * 0.5})` }}
                          />
                        )}
                        <span className="relative z-10 font-bold text-slate-900/80 text-[9px] leading-none">
                          {convert(p.temperature)}°
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[9px] text-slate-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ background: 'rgba(96,165,250,0.4)' }} />
          Superposición azul = prob. de lluvia
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm bg-slate-500/30" />
          Hover = detalle
        </div>
      </div>
    </div>
  )
}
