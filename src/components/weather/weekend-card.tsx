'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'
import { getWeatherInfo } from '@/lib/weather-codes'

function activityScore(tempMax: number, precipProb: number, windMax: number, uv: number): number {
  const tempScore = tempMax >= 18 && tempMax <= 28 ? 100 : tempMax < 10 || tempMax > 35 ? 20 : tempMax < 18 ? 60 : 70
  const rainScore = precipProb <= 20 ? 100 : precipProb <= 40 ? 70 : precipProb <= 70 ? 40 : 10
  const windScore = windMax < 20 ? 100 : windMax < 40 ? 75 : windMax < 60 ? 45 : 20
  const uvScore = uv <= 7 ? 100 : uv <= 10 ? 70 : 40
  return Math.round(tempScore * 0.35 + rainScore * 0.35 + windScore * 0.15 + uvScore * 0.15)
}

function scoreColor(s: number): string {
  if (s >= 80) return '#4ade80'
  if (s >= 60) return '#a3e635'
  if (s >= 40) return '#facc15'
  if (s >= 20) return '#fb923c'
  return '#f87171'
}

function scoreLabel(s: number): string {
  if (s >= 80) return 'Ideal'
  if (s >= 60) return 'Bueno'
  if (s >= 40) return 'Aceptable'
  return 'Nublado/Lluvia'
}

export function WeekendCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather || !weather.daily.length) return null

  const now = new Date()
  const todayDOW = now.getDay() // 0=Sun, 6=Sat

  // Find next Saturday and Sunday in the daily forecast
  const weekendDays = weather.daily.filter(d => {
    const date = new Date(d.date + 'T12:00:00')
    const dow = date.getDay()
    return (dow === 6 || dow === 0) // Sat or Sun
  }).slice(0, 2)

  if (weekendDays.length === 0) {
    // No weekend in 7-day forecast (shouldn't happen)
    return null
  }

  // Check if this weekend or next
  const daysUntilWeekend = weekendDays[0]
    ? Math.round((new Date(weekendDays[0].date + 'T12:00:00').getTime() - now.getTime()) / 86400000)
    : 999

  const headerLabel = daysUntilWeekend <= 2 ? 'Este fin de semana' : 'Próximo fin de semana'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        🏖 {headerLabel}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {weekendDays.map(day => {
          const date = new Date(day.date + 'T12:00:00')
          const dayName = date.getDay() === 6 ? 'Sábado' : 'Domingo'
          const dateStr = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
          const { icon, label } = getWeatherInfo(day.weatherCode)
          const score = activityScore(day.tempMax, day.precipitationProbability, day.windSpeedMax, day.uvIndexMax)
          const color = scoreColor(score)

          return (
            <div key={day.date} className="bg-white/5 rounded-2xl p-4 space-y-3">
              {/* Header */}
              <div>
                <div className="text-sm font-semibold text-slate-200">{dayName}</div>
                <div className="text-[11px] text-slate-500">{dateStr}</div>
              </div>

              {/* Weather icon + condition */}
              <div className="flex items-center gap-2">
                <span className="text-3xl">{icon}</span>
                <span className="text-[11px] text-slate-400 leading-tight">{label}</span>
              </div>

              {/* Temperature range */}
              <div className="flex items-end gap-1">
                <span className="text-xl font-bold text-slate-200">{Math.round(day.tempMax)}°</span>
                <span className="text-sm text-slate-500 mb-0.5">/ {Math.round(day.tempMin)}°</span>
              </div>

              {/* Details */}
              <div className="space-y-1 text-[11px] text-slate-400">
                {day.precipitationProbability > 0 && (
                  <div className="flex justify-between">
                    <span>💧 Lluvia</span>
                    <span className={day.precipitationProbability > 50 ? 'text-blue-400' : ''}>{day.precipitationProbability}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>💨 Viento</span>
                  <span>{Math.round(day.windSpeedMax)} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span>☀ UV</span>
                  <span>{day.uvIndexMax.toFixed(1)}</span>
                </div>
              </div>

              {/* Activity score */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-500">Para salir</span>
                  <span className="text-[10px] font-semibold" style={{ color }}>{scoreLabel(score)}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {daysUntilWeekend > 5 && (
        <div className="mt-3 text-[10px] text-slate-700 text-center">
          El fin de semana es dentro de {daysUntilWeekend} días
        </div>
      )}
    </div>
  )
}
