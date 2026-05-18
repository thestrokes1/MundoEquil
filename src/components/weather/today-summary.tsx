'use client'
import { useLocationStore } from '@/stores/location-store'
import { formatTemp, formatSpeed } from '@/lib/utils'
import { getUVLabel, getWindDirection } from '@/lib/weather-codes'
import type { CurrentWeather, DailyForecast, AirQuality } from '@/types/weather'
import { getAQIInfo } from '@/lib/aqi'

interface Props {
  current: CurrentWeather
  today: DailyForecast
  airQuality?: AirQuality
}

export function TodaySummary({ current, today, airQuality }: Props) {
  const { unit, speedUnit } = useLocationStore()
  const uvInfo = getUVLabel(current.uvIndex)
  const windDir = getWindDirection(current.windDeg)

  const rainProbability = today.precipitationProbability
  const rainDesc =
    rainProbability >= 70 ? 'alta probabilidad de lluvia' :
    rainProbability >= 40 ? 'posibilidad de lluvia' :
    rainProbability >= 20 ? 'poca probabilidad de lluvia' :
    'sin lluvia esperada'

  const aqiLabel = airQuality ? getAQIInfo(airQuality.aqi).label.toLowerCase() : null

  const parts: string[] = [
    `Hoy en ${current.description.toLowerCase()}, con temperatura actual de ${formatTemp(current.temperature, unit)} (sensación ${formatTemp(current.feelsLike, unit)}).`,
    `Máxima esperada de ${formatTemp(today.tempMax, unit)}, mínima de ${formatTemp(today.tempMin, unit)}.`,
    `Viento ${windDir} a ${formatSpeed(current.windSpeed, speedUnit)}${current.windGust ? `, ráfagas hasta ${formatSpeed(current.windGust, speedUnit)}` : ''}.`,
    `Índice UV ${current.uvIndex.toFixed(1)} (${uvInfo.label.toLowerCase()}).`,
    `${rainDesc.charAt(0).toUpperCase() + rainDesc.slice(1)} (${rainProbability}%).`,
  ]

  if (aqiLabel) {
    parts.push(`Calidad del aire ${aqiLabel} (AQI ${airQuality!.aqi}).`)
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/60 to-slate-800/40 backdrop-blur-md px-6 py-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">📋</span>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
            Resumen del día
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {parts.join(' ')}
          </p>
        </div>
      </div>
    </div>
  )
}
