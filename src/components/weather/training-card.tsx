'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

interface TrainingWindow {
  hour: string
  score: number
  label: string
  color: string
  reason: string
}

function trainingScore(temp: number, rh: number, wind: number, uv: number, precip: number, isDay: number): {
  score: number; label: string; color: string; reason: string
} {
  let score = 100
  const reasons: string[] = []

  // Temperature penalty
  if (temp < 0) { score -= 40; reasons.push('helada') }
  else if (temp < 5) { score -= 20; reasons.push('muy frío') }
  else if (temp < 10) { score -= 8 }
  else if (temp > 30) { score -= 20; reasons.push('calor') }
  else if (temp > 25) { score -= 8 }
  else if (temp > 35) { score -= 40; reasons.push('calor extremo') }

  // Humidity penalty (over 80% adds heat stress)
  if (rh > 90) { score -= 20; reasons.push('humedad alta') }
  else if (rh > 80) { score -= 8 }

  // Precipitation
  if (precip > 50) { score -= 30; reasons.push('lluvia') }
  else if (precip > 25) { score -= 15 }
  else if (precip > 10) { score -= 5 }

  // Wind (headwind is effort penalty, tailwind is bonus)
  if (wind > 50) { score -= 25; reasons.push('viento fuerte') }
  else if (wind > 30) { score -= 12 }
  else if (wind > 20) { score -= 5 }

  // UV (midday sun, prefer early morning or evening)
  if (uv > 9) { score -= 20; reasons.push('UV extremo') }
  else if (uv > 6) { score -= 10 }

  // Night bonus (cooler, no UV)
  if (!isDay) { score += 5 }

  score = Math.max(0, Math.min(100, score))

  let label = 'Excelente'
  let color = '#4ade80'
  if (score < 20) { label = 'Peligroso'; color = '#f87171' }
  else if (score < 40) { label = 'Malo'; color = '#fb923c' }
  else if (score < 60) { label = 'Regular'; color = '#facc15' }
  else if (score < 80) { label = 'Bueno'; color = '#a3e635' }

  return { score, label, color, reason: reasons.join(', ') || 'condiciones ideales' }
}

function clockLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function TrainingCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  // Build 48h windows
  const windows: TrainingWindow[] = weather.hourly.slice(0, 48).map(h => {
    // HourlyForecast has no uvIndex; isDay is boolean
    const t = trainingScore(
      h.temperature, h.humidity, h.windSpeed ?? 0,
      0, h.precipitationProbability ?? 0, h.isDay ? 1 : 0
    )
    return { hour: h.time, ...t }
  })

  // Best 3 windows today (first 24h)
  const todayWindows = windows.slice(0, 24)
  const bestToday = [...todayWindows]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.hour.localeCompare(b.hour))

  const now = windows[0]

  // Today heat zone warning
  // HourlyForecast has no uvIndex; use current UV from current weather
  const peakUV = weather.current.uvIndex ?? 0
  const peakTemp = Math.max(...weather.hourly.slice(0, 24).map(h => h.temperature))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🏃 Entrenamiento al Aire Libre</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: now.color, borderColor: now.color + '44', background: now.color + '1a'
        }}>
          Ahora: {now.label}
        </span>
      </div>

      {/* Best windows */}
      <div className="mb-4">
        <div className="text-[10px] text-slate-600 mb-2">Mejores ventanas hoy</div>
        <div className="space-y-1.5">
          {bestToday.map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl text-xs">
              <span className="font-medium text-slate-300 w-12">{clockLabel(w.hour)}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${w.score}%`, background: w.color }} />
              </div>
              <span className="font-bold w-8 text-right" style={{ color: w.color }}>{w.score}</span>
              <span className="text-slate-600 text-[10px] w-28 truncate">{w.reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heat advisory */}
      {peakTemp > 28 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-orange-500/20 bg-orange-500/10 text-orange-300">
          🌡 Pico térmico: {peakTemp}°C · Hidratarse cada 15 min, evitar 11–16h
        </div>
      )}
      {peakUV > 7 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-amber-500/20 bg-amber-500/10 text-amber-300">
          ☀️ UV máximo {peakUV} · Usar protector SPF50+, gorra y lentes
        </div>
      )}

      {/* 48h heatmap */}
      <div className="text-[10px] text-slate-600 mb-1">Índice de entrenamiento — 48h</div>
      <div className="flex gap-0.5 h-8">
        {windows.map((w, i) => (
          <div key={i} className="flex-1 rounded-sm" title={`${clockLabel(w.hour)}: ${w.score} (${w.label})`}
            style={{ background: w.color, opacity: 0.3 + (w.score / 100) * 0.7 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
        <span>Ahora</span><span>+12h</span><span>+24h</span><span>+36h</span><span>+48h</span>
      </div>

      {/* Sport-specific tips */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {[
          { sport: '🏃 Correr', ideal: '5–18°C, sin lluvia, viento <20', ok: weather.current.temperature >= 5 && weather.current.temperature <= 25 },
          { sport: '🚴 Ciclismo', ideal: '8–22°C, viento <30', ok: (now?.score ?? 0) >= 60 },
        ].map(s => (
          <div key={s.sport} className="bg-white/5 rounded-xl px-3 py-2">
            <div className="font-medium text-slate-300">{s.sport}</div>
            <div className={`text-[10px] mt-0.5 ${s.ok ? 'text-green-400' : 'text-amber-400'}`}>
              {s.ok ? '✓ Condiciones OK' : '⚠ Condiciones no ideales'}
            </div>
            <div className="text-[9px] text-slate-700 mt-0.5">{s.ideal}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
