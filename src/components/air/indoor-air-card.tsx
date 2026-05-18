'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'
import type { AirQuality } from '@/types/weather'

interface VentilationWindow {
  start: number   // hour
  end: number
  quality: 'excellent' | 'good' | 'acceptable' | 'poor'
  reason: string
}

interface IndoorMetric {
  label: string
  current: string
  target: string
  status: 'ok' | 'warning' | 'bad'
  icon: string
}

function ventilationAdvice(
  aqi: number, temp: number, humidity: number, wind: number, hour: number
): { score: number; label: string; color: string } {
  let score = 100

  // AQI penalty
  if (aqi > 100) score -= 50
  else if (aqi > 50) score -= 20
  else if (aqi > 25) score -= 8

  // Temperature penalty (too hot = don't let hot air in, too cold = heat loss)
  if (temp > 35 || temp < 0) score -= 30
  else if (temp > 28 || temp < 5) score -= 12

  // Humidity: ideal indoor 40-60%
  if (humidity > 80) score -= 20
  else if (humidity > 70) score -= 8
  else if (humidity < 20) score -= 10

  // Wind: moderate wind aids ventilation
  if (wind > 50) score -= 10
  else if (wind > 10) score += 5

  // Time bonus: early morning best
  if (hour >= 6 && hour <= 9) score += 10
  else if (hour >= 22 || hour <= 5) score -= 5

  score = Math.max(0, Math.min(100, score))
  const label = score >= 80 ? 'Ideal para ventilar' : score >= 60 ? 'Bueno para ventilar' : score >= 40 ? 'Aceptable' : 'No ventile ahora'
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#a3e635' : score >= 40 ? '#facc15' : '#f87171'
  return { score, label, color }
}

export function IndoorAirCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])
  const airQuality = qc.getQueryData<AirQuality>(['air-quality', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const now = new Date()
  const currentHour = now.getHours()
  const aqi = airQuality?.aqi ?? 50
  const pm25 = airQuality?.pm25 ?? 10

  const currentVent = ventilationAdvice(aqi, c.temperature, c.humidity, c.windSpeed, currentHour)

  // 24h ventilation windows from hourly data
  const hourlyVent = weather.hourly.slice(0, 24).map((h, i) => ({
    hour: i,
    ...ventilationAdvice(aqi, h.temperature, h.humidity, h.windSpeed ?? 0, i),
  }))

  const bestHours = [...hourlyVent].sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.hour - b.hour)

  // Indoor estimates based on outdoor
  // Typical indoor/outdoor ratio for pollutants when windows closed
  const indoorPm25 = parseFloat((pm25 * 0.65 + 5).toFixed(1))  // 65% ingress + baseline
  const indoorHumidity = Math.min(100, Math.round(c.humidity * 0.85 + 5))  // indoor usually less variable
  const indoorTemp = c.temperature < 18
    ? Math.round(c.temperature + 8)   // heated
    : c.temperature > 28
    ? Math.round(c.temperature - 5)  // cooled
    : Math.round(c.temperature + 2)  // natural

  const metrics: IndoorMetric[] = [
    {
      label: 'PM2.5 estimado',
      current: `${indoorPm25} µg/m³`,
      target: '< 12 µg/m³',
      status: indoorPm25 < 12 ? 'ok' : indoorPm25 < 35 ? 'warning' : 'bad',
      icon: '💨',
    },
    {
      label: 'Humedad relativa',
      current: `${indoorHumidity}%`,
      target: '40–60%',
      status: indoorHumidity >= 40 && indoorHumidity <= 60 ? 'ok' : indoorHumidity > 70 ? 'bad' : 'warning',
      icon: '💧',
    },
    {
      label: 'Temperatura estimada',
      current: `${indoorTemp}°C`,
      target: '18–24°C',
      status: indoorTemp >= 18 && indoorTemp <= 24 ? 'ok' : indoorTemp < 15 || indoorTemp > 28 ? 'bad' : 'warning',
      icon: '🌡',
    },
  ]

  const STATUS_COLORS = { ok: '#4ade80', warning: '#facc15', bad: '#f87171' }

  // Seasonal mold risk
  const moldRisk = c.humidity > 70 && c.temperature > 15
  // Outdoor CO2 vs indoor (indoor naturally higher)
  const openWindowCO2Benefit = aqi < 60 && c.windSpeed > 5

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🏠 Calidad del Aire Interior</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: currentVent.color, borderColor: currentVent.color + '44', background: currentVent.color + '1a'
        }}>
          {currentVent.label}
        </span>
      </div>

      {/* Current ventilation score */}
      <div className="mb-4 bg-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium">Índice de ventilación ahora</div>
          <div className="text-[10px] text-slate-600 mt-0.5">AQI {aqi} · {c.temperature}°C · HR {c.humidity}%</div>
        </div>
        <div className="text-3xl font-bold" style={{ color: currentVent.color }}>{currentVent.score}</div>
      </div>

      {/* Indoor air metrics */}
      <div className="space-y-2 mb-4">
        <div className="text-[10px] text-slate-600 mb-1">Estimaciones interiores (ventanas cerradas)</div>
        {metrics.map(m => (
          <div key={m.label} className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl text-xs">
            <span>{m.icon}</span>
            <div className="flex-1">
              <div className="text-slate-400">{m.label}</div>
              <div className="text-[9px] text-slate-600">Ideal: {m.target}</div>
            </div>
            <div className="text-right">
              <div className="font-bold" style={{ color: STATUS_COLORS[m.status] }}>{m.current}</div>
              <div className="text-[9px]" style={{ color: STATUS_COLORS[m.status] }}>
                {m.status === 'ok' ? '✓ OK' : m.status === 'warning' ? '⚠ Vigilar' : '✗ Mejorar'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mold risk */}
      {moldRisk && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-amber-500/20 bg-amber-500/10 text-amber-300">
          🦠 Condiciones favorables para moho: deshumidificación recomendada
        </div>
      )}

      {/* Best ventilation hours */}
      <div className="mb-3">
        <div className="text-[10px] text-slate-600 mb-1.5">Mejores horas para ventilar hoy</div>
        <div className="flex gap-2">
          {bestHours.map((h, i) => (
            <div key={i} className="flex-1 text-center bg-white/5 rounded-xl py-2" style={{
              border: `1px solid ${h.color}33`, background: h.color + '0f'
            }}>
              <div className="font-bold text-sm" style={{ color: h.color }}>
                {String(h.hour).padStart(2, '0')}:00
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5">Score {h.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 24h ventilation heatmap */}
      <div className="text-[10px] text-slate-600 mb-1">Calidad de ventilación por hora</div>
      <div className="flex gap-0.5 h-5">
        {hourlyVent.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" title={`${i}h: ${h.label}`}
            style={{ background: h.color, opacity: 0.4 + (h.score / 100) * 0.6 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>

      <div className="mt-3 text-[9px] text-slate-700 text-center">
        Estimaciones basadas en relaciones exterior/interior · No sustituye a sensores de IAQ
      </div>
    </div>
  )
}
