'use client'
import { Droplets, Wind, Eye, Gauge, Thermometer, ArrowUp, ArrowDown } from 'lucide-react'
import { useLocationStore } from '@/stores/location-store'
import { WeatherIcon } from './weather-icon'
import { DataFreshness } from '@/components/shared/data-freshness'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTemp, formatSpeed } from '@/lib/utils'
import { getWindDirection, getUVLabel } from '@/lib/weather-codes'
import type { CurrentWeather as ICurrentWeather, Location } from '@/types/weather'

interface Props {
  current: ICurrentWeather
  location: Location
  isFetching?: boolean
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="text-slate-200 font-medium ml-auto">{value}</span>
    </div>
  )
}

export function CurrentWeatherCard({ current, location, isFetching }: Props) {
  const { unit, speedUnit } = useLocationStore()
  const uvInfo = getUVLabel(current.uvIndex)

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-900/40 via-slate-900/60 to-indigo-900/40 border border-white/10 backdrop-blur-md p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent pointer-events-none" />

      <div className="relative flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{location.name}</h2>
            <p className="text-slate-400 text-sm">{[location.state, location.country].filter(Boolean).join(', ')}</p>
          </div>
          <DataFreshness updatedAt={current.updatedAt} refetching={isFetching} />
        </div>

        {/* Main temp + icon */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-7xl font-bold text-slate-100 leading-none tabular-nums">
              {formatTemp(current.temperature, unit)}
            </div>
            <div className="mt-2 text-slate-400 text-sm">{current.description}</div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-red-400" />
                {formatTemp(current.tempMax, unit)}
              </span>
              <span className="flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-blue-400" />
                {formatTemp(current.tempMin, unit)}
              </span>
            </div>
          </div>
          <WeatherIcon icon={current.icon} size="xl" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-3 border-t border-white/10">
          <StatItem
            icon={<Thermometer className="w-4 h-4" />}
            label="Sensación"
            value={formatTemp(current.feelsLike, unit)}
          />
          <StatItem
            icon={<Droplets className="w-4 h-4" />}
            label="Humedad"
            value={`${current.humidity}%`}
          />
          <StatItem
            icon={<Wind className="w-4 h-4" />}
            label="Viento"
            value={`${formatSpeed(current.windSpeed, speedUnit)} ${getWindDirection(current.windDeg)}`}
          />
          <StatItem
            icon={<Gauge className="w-4 h-4" />}
            label="Presión"
            value={`${Math.round(current.pressure)} hPa`}
          />
          <StatItem
            icon={<Eye className="w-4 h-4" />}
            label="Visibilidad"
            value={`${current.visibility.toFixed(1)} km`}
          />
          <StatItem
            icon={<span className="text-xs font-bold">UV</span>}
            label="Índice UV"
            value={`${current.uvIndex} — ${uvInfo.label}`}
          />
        </div>
      </div>
    </div>
  )
}

export function CurrentWeatherSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36 bg-white/10" />
          <Skeleton className="h-4 w-24 bg-white/10" />
        </div>
      </div>
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-20 w-40 bg-white/10" />
          <Skeleton className="h-4 w-28 bg-white/10" />
        </div>
        <Skeleton className="h-24 w-24 rounded-full bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 bg-white/10" />
        ))}
      </div>
    </div>
  )
}
