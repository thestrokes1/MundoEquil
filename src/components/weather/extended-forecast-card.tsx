'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { getWeatherInfo } from '@/lib/weather-codes'
import type { ExtendedForecastData } from '@/app/api/forecast-extended/route'

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function tempColor(max: number): string {
  if (max < 0)  return '#93c5fd'
  if (max < 10) return '#67e8f9'
  if (max < 20) return '#4ade80'
  if (max < 28) return '#facc15'
  if (max < 35) return '#fb923c'
  return '#f87171'
}

interface TempBarProps {
  min: number
  max: number
  absMin: number
  absMax: number
}

function TempBar({ min, max, absMin, absMax }: TempBarProps) {
  const range = absMax - absMin || 1
  const left = ((min - absMin) / range) * 100
  const width = Math.max(((max - min) / range) * 100, 4)
  return (
    <div className="relative h-1.5 bg-white/5 rounded-full flex-1 min-w-[60px]">
      <div
        className="absolute h-full rounded-full"
        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: tempColor(max) }}
      />
    </div>
  )
}

export function ExtendedForecastCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ExtendedForecastData>({
    queryKey: ['forecast-extended', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/forecast-extended?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-2">
        <Skeleton className="h-4 w-44 bg-white/10 mb-4" />
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-7 bg-white/10" />)}
      </div>
    )
  }

  if (!data || !data.days?.length) return null

  const temps = data.days.flatMap(d => [d.tempMax, d.tempMin]).filter((t): t is number => t !== null)
  const absMin = Math.min(...temps)
  const absMax = Math.max(...temps)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Pronóstico 16 Días</h3>

      <div className="space-y-0.5">
        {data.days.map((day, i) => {
          const date = new Date(day.date + 'T12:00:00')
          const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DAYS_ES[date.getDay()]
          const dateStr = `${date.getDate()} ${MONTHS_ES[date.getMonth()]}`
          const { icon } = getWeatherInfo(day.weatherCode)
          const isToday = i === 0

          return (
            <div
              key={day.date}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs ${isToday ? 'bg-white/8 border border-white/10' : 'hover:bg-white/5 transition-colors'}`}
            >
              {/* Day name + date */}
              <div className="w-12 shrink-0">
                <div className={`font-medium ${isToday ? 'text-sky-300' : 'text-slate-300'}`}>{dayName}</div>
                <div className="text-[10px] text-slate-600">{dateStr}</div>
              </div>

              {/* Weather icon */}
              <span className="text-base w-6 shrink-0 text-center">{icon}</span>

              {/* Precip probability */}
              <div className="w-9 shrink-0 text-right">
                {day.precipProbMax !== null && day.precipProbMax > 5 ? (
                  <span className={
                    day.precipProbMax > 60 ? 'text-blue-400' :
                    day.precipProbMax > 30 ? 'text-sky-400' : 'text-slate-500'
                  }>
                    {day.precipProbMax}%
                  </span>
                ) : (
                  <span className="text-slate-700">—</span>
                )}
              </div>

              {/* Temp min */}
              <span className="text-[11px] text-slate-500 w-7 shrink-0 text-right">
                {day.tempMin !== null ? `${Math.round(day.tempMin)}°` : '—'}
              </span>

              {/* Temp bar */}
              {day.tempMin !== null && day.tempMax !== null ? (
                <TempBar min={day.tempMin} max={day.tempMax} absMin={absMin} absMax={absMax} />
              ) : (
                <div className="flex-1" />
              )}

              {/* Temp max */}
              <span className="text-[11px] text-slate-200 w-7 shrink-0">
                {day.tempMax !== null ? `${Math.round(day.tempMax)}°` : '—'}
              </span>

              {/* Wind */}
              <div className="w-14 shrink-0 text-right text-slate-600 text-[10px]">
                {day.windSpeedMax !== null ? `${Math.round(day.windSpeedMax)} km/h` : ''}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex gap-3 text-[10px] text-slate-700 flex-wrap">
        <span>💧 prob. lluvia</span>
        <span>·</span>
        <span>barra = rango temp.</span>
        <span>·</span>
        <span>💨 viento máx.</span>
      </div>
    </div>
  )
}
