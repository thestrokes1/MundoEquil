'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { getMoonPhase } from '@/lib/moon'
import { getMoonPhaseLabel, getWindDirection } from '@/lib/weather-codes'
import type { WeatherData } from '@/types/weather'
import type { AirQuality } from '@/types/weather'
import type { PressurePoint } from '@/app/api/pressure-trend/route'
import type { SpaceWeatherData } from '@/app/api/space-weather/route'

function buildBriefing(
  weather: WeatherData,
  airQuality: AirQuality | null,
  pressurePoints: PressurePoint[] | null,
  spaceWeather: SpaceWeatherData | null,
  locationName: string,
): string {
  const c = weather.current
  const today = weather.daily[0]
  const parts: string[] = []

  // Date
  const dateStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const capDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  parts.push(`**${capDate}** en **${locationName}**.`)

  // Temperature summary
  const feelsDiff = Math.round(c.feelsLike - c.temperature)
  const feelsStr = Math.abs(feelsDiff) >= 3
    ? ` (sensación ${c.feelsLike}°C, ${feelsDiff > 0 ? 'más cálido' : 'más frío'} de lo real)`
    : ''
  parts.push(`Temperatura actual ${Math.round(c.temperature)}°C${feelsStr}, con máxima de ${today.tempMax}°C y mínima de ${today.tempMin}°C esperadas.`)

  // Condition
  parts.push(`Cielo: ${c.description.toLowerCase()}.`)

  // Precipitation
  if (today.precipitationProbability >= 40) {
    parts.push(`Probabilidad de precipitación del ${today.precipitationProbability}% — ${today.precipitationProbability >= 70 ? 'lleva paraguas' : 'posible lluvia'}.`)
  }

  // Wind
  const windDir = getWindDirection(c.windDeg)
  if (c.windSpeed >= 50) {
    parts.push(`Viento fuerte de ${Math.round(c.windSpeed)} km/h desde el ${windDir}.`)
  } else if (c.windSpeed >= 20) {
    parts.push(`Viento moderado de ${Math.round(c.windSpeed)} km/h.`)
  }

  // UV
  if (c.uvIndex >= 8) {
    parts.push(`Índice UV muy alto (${c.uvIndex}) — protección solar imprescindible.`)
  } else if (c.uvIndex >= 5) {
    parts.push(`Índice UV moderado-alto (${c.uvIndex}).`)
  }

  // Air quality
  if (airQuality) {
    const aqiMap: Record<string, string> = {
      good: 'buena',
      moderate: 'moderada',
      sensitive: 'mala para grupos sensibles',
      unhealthy: 'mala',
      'very-unhealthy': 'muy mala',
      hazardous: 'peligrosa',
    }
    const aqiLabel = aqiMap[airQuality.category] ?? airQuality.category
    if (airQuality.aqi > 50) {
      parts.push(`Calidad del aire ${aqiLabel} (AQI ${airQuality.aqi}).`)
    }
  }

  // Pressure trend
  if (pressurePoints && pressurePoints.length >= 4) {
    const now = new Date()
    const recent = pressurePoints.filter(p => {
      const t = new Date(p.time)
      return t <= now && t >= new Date(now.getTime() - 3 * 3600_000)
    })
    if (recent.length >= 2) {
      const delta = recent[recent.length - 1].pressure - recent[0].pressure
      if (delta > 1) parts.push('Presión atmosférica en ascenso — tiempo estable esperado.')
      else if (delta < -1) parts.push('Presión en descenso — posible cambio de tiempo o lluvia próxima.')
    }
  }

  // Moon phase
  const moonPhase = getMoonPhase()
  const { label: moonLabelStr, emoji: moonEmoji } = getMoonPhaseLabel(moonPhase)
  const isFullMoon = moonPhase >= 0.46 && moonPhase <= 0.54
  const isNewMoon = moonPhase <= 0.04 || moonPhase >= 0.96
  if (isFullMoon) {
    parts.push('🌕 Esta noche hay luna llena — ideal para observar noches despejadas.')
  } else if (isNewMoon) {
    parts.push('🌑 Luna nueva — ideal para astronomía.')
  } else {
    parts.push(`${moonEmoji} Luna en fase ${moonLabelStr.toLowerCase()}.`)
  }

  // Space weather
  if (spaceWeather && spaceWeather.kpIndex !== null && spaceWeather.geoStormLevel >= 2) {
    parts.push(`⚡ Tormenta geomagnética ${spaceWeather.geoStormLabel} (Kp ${spaceWeather.kpIndex.toFixed(1)}).`)
    if (spaceWeather.geoStormLevel >= 3) {
      parts.push(`Aurora boreal visible desde ~${spaceWeather.auroraLatitude}°N.`)
    }
  }

  return parts.join(' ')
}

function renderBriefing(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-slate-200">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export function DailyBriefing() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()

  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])
  const airQuality = qc.getQueryData<AirQuality>(['air-quality', location?.lat, location?.lon])
  const pressurePoints = qc.getQueryData<PressurePoint[]>(['pressure-trend', location?.lat, location?.lon])
  const spaceWeather = qc.getQueryData<SpaceWeatherData>(['space-weather'])

  if (!location || !weather) return null

  const briefing = buildBriefing(
    weather,
    airQuality ?? null,
    pressurePoints ?? null,
    spaceWeather ?? null,
    location.name,
  )

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-950/40 to-slate-950/40 backdrop-blur-md p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Resumen del día</h3>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">
        {renderBriefing(briefing)}
      </p>
    </div>
  )
}
