'use client'
import { AlertTriangle, Flame, Snowflake, Wind, Droplets, Eye } from 'lucide-react'
import type { CurrentWeather, AirQuality } from '@/types/weather'
import { getAQIInfo } from '@/lib/aqi'

interface Alert {
  icon: React.ReactNode
  message: string
  level: 'warning' | 'danger' | 'info'
}

function buildAlerts(w: CurrentWeather, aq?: AirQuality): Alert[] {
  const alerts: Alert[] = []

  if (w.temperature >= 38) {
    alerts.push({ icon: <Flame className="w-4 h-4" />, message: `Calor extremo: ${Math.round(w.temperature)}°C — riesgo de golpe de calor`, level: 'danger' })
  } else if (w.feelsLike >= 35) {
    alerts.push({ icon: <Flame className="w-4 h-4" />, message: `Sensación de calor muy alta: ${Math.round(w.feelsLike)}°C — manténte hidratado`, level: 'warning' })
  }

  if (w.temperature <= -5) {
    alerts.push({ icon: <Snowflake className="w-4 h-4" />, message: `Frío extremo: ${Math.round(w.temperature)}°C — riesgo de hipotermia al aire libre`, level: 'danger' })
  } else if (w.feelsLike <= -10) {
    alerts.push({ icon: <Snowflake className="w-4 h-4" />, message: `Sensación de frío muy baja: ${Math.round(w.feelsLike)}°C — abrígate bien`, level: 'warning' })
  }

  if (w.windSpeed >= 75) {
    alerts.push({ icon: <Wind className="w-4 h-4" />, message: `Vientos muy fuertes: ${Math.round(w.windSpeed)} km/h — posible peligro en exteriores`, level: 'danger' })
  } else if (w.windSpeed >= 50) {
    alerts.push({ icon: <Wind className="w-4 h-4" />, message: `Vientos fuertes: ${Math.round(w.windSpeed)} km/h — precaución en exteriores`, level: 'warning' })
  }

  if (w.visibility < 1) {
    alerts.push({ icon: <Eye className="w-4 h-4" />, message: `Visibilidad muy baja: ${w.visibility.toFixed(1)} km — niebla densa`, level: 'danger' })
  } else if (w.visibility < 3) {
    alerts.push({ icon: <Eye className="w-4 h-4" />, message: `Visibilidad reducida: ${w.visibility.toFixed(1)} km — conduce con precaución`, level: 'warning' })
  }

  if (aq && aq.aqi > 150) {
    const info = getAQIInfo(aq.aqi)
    alerts.push({ icon: <Droplets className="w-4 h-4" />, message: `Calidad del aire ${info.label} (AQI ${aq.aqi}) — ${info.recommendation}`, level: aq.aqi > 200 ? 'danger' : 'warning' })
  }

  return alerts
}

interface Props {
  weather: CurrentWeather
  airQuality?: AirQuality
}

export function AlertBanner({ weather, airQuality }: Props) {
  const alerts = buildAlerts(weather, airQuality)
  if (alerts.length === 0) return null

  const levelStyles = {
    danger:  'bg-red-950/60 border-red-500/40 text-red-300',
    warning: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
    info:    'bg-sky-950/60 border-sky-500/40 text-sky-300',
  }

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div key={i} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${levelStyles[a.level]}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {a.icon}
          <span className="text-sm font-medium">{a.message}</span>
        </div>
      ))}
    </div>
  )
}
