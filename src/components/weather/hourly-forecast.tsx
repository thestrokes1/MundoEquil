'use client'
import { Droplets } from 'lucide-react'
import { useLocationStore } from '@/stores/location-store'
import { WeatherIcon } from './weather-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTemp, formatHour } from '@/lib/utils'
import { getWeatherInfo } from '@/lib/weather-codes'
import type { HourlyForecast } from '@/types/weather'

interface Props {
  hourly: HourlyForecast[]
}

export function HourlyForecastCard({ hourly }: Props) {
  const { unit } = useLocationStore()
  const next24 = hourly.slice(0, 24)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Próximas 24 horas
      </h3>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-3 w-max pb-2">
          {next24.map((h, i) => {
            const info = getWeatherInfo(h.weatherCode)
            const icon = h.isDay ? info.day : info.night
            const isNow = i === 0
            return (
              <div
                key={h.time}
                className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-3 min-w-[60px] transition-colors ${
                  isNow ? 'bg-sky-500/20 border border-sky-400/30' : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xs text-slate-400 font-medium">
                  {isNow ? 'Ahora' : formatHour(h.time)}
                </span>
                <WeatherIcon icon={icon} size="sm" />
                <span className="text-sm font-semibold text-slate-100">
                  {formatTemp(h.temperature, unit)}
                </span>
                {h.precipitationProbability > 10 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-sky-400">
                    <Droplets className="w-3 h-3" />
                    {h.precipitationProbability}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function HourlyForecastSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <Skeleton className="h-4 w-40 mb-4 bg-white/10" />
      <div className="flex gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-[60px] rounded-2xl bg-white/10 shrink-0" />
        ))}
      </div>
    </div>
  )
}
