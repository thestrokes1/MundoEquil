'use client'
import { Droplets, Wind } from 'lucide-react'
import { useLocationStore } from '@/stores/location-store'
import { WeatherIcon } from './weather-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTemp, formatDate, formatSpeed } from '@/lib/utils'
import { getWeatherInfo } from '@/lib/weather-codes'
import type { DailyForecast } from '@/types/weather'

interface Props {
  daily: DailyForecast[]
}

export function DailyForecastCard({ daily }: Props) {
  const { unit, speedUnit } = useLocationStore()

  const globalMax = Math.max(...daily.map((d) => d.tempMax))
  const globalMin = Math.min(...daily.map((d) => d.tempMin))
  const range = globalMax - globalMin || 1

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Pronóstico 7 días
      </h3>
      <div className="space-y-2">
        {daily.map((d, i) => {
          const info = getWeatherInfo(d.weatherCode)
          const barLeft = ((d.tempMin - globalMin) / range) * 100
          const barWidth = ((d.tempMax - d.tempMin) / range) * 100

          return (
            <div key={d.date} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-10 shrink-0">
                {i === 0 ? 'Hoy' : formatDate(d.date).split(' ')[0]}
              </span>
              <span className="text-lg leading-none w-8 shrink-0">{info.icon}</span>
              {d.precipitationProbability > 10 && (
                <span className="flex items-center gap-0.5 text-[10px] text-sky-400 w-10 shrink-0">
                  <Droplets className="w-3 h-3" />
                  {d.precipitationProbability}%
                </span>
              )}
              {d.precipitationProbability <= 10 && <span className="w-10 shrink-0" />}
              <span className="text-xs text-slate-500 w-12 text-right shrink-0">
                {formatTemp(d.tempMin, unit)}
              </span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full relative min-w-[60px]">
                <div
                  className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
                  style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                />
              </div>
              <span className="text-xs text-slate-200 w-12 shrink-0">
                {formatTemp(d.tempMax, unit)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DailyForecastSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-2">
      <Skeleton className="h-4 w-36 mb-4 bg-white/10" />
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-6 bg-white/10" />
      ))}
    </div>
  )
}
