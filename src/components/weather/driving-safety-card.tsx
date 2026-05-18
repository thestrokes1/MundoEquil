'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'
import type { ComfortData } from '@/app/api/comfort/route'

interface RiskFactor {
  label: string
  emoji: string
  score: number   // 0–100, higher = safer
  risk: string
  color: string
}

function safeColor(score: number): string {
  if (score >= 80) return '#4ade80'
  if (score >= 60) return '#a3e635'
  if (score >= 40) return '#facc15'
  if (score >= 20) return '#fb923c'
  return '#f87171'
}

export function DrivingSafetyCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()

  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])
  const comfortData = qc.getQueryData<ComfortData>(['comfort', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const today = weather.daily[0]

  const visKm = c.visibility / 1000  // convert m to km
  const wind = c.windSpeed
  const precip = today.precipitation
  const precipProb = today.precipitationProbability
  const temp = c.temperature
  const humidity = c.humidity

  // Get dew point from comfort data
  const now = new Date()
  const comfortIdx = comfortData?.points
    ? comfortData.points.reduce((best, p, i) =>
        Math.abs(new Date(p.time).getTime() - now.getTime()) <
        Math.abs(new Date(comfortData.points[best].time).getTime() - now.getTime()) ? i : best
      , 0)
    : -1
  const dewPoint = comfortIdx >= 0 ? (comfortData?.points[comfortIdx]?.dewPoint ?? null) : null
  const dewSpread = dewPoint !== null ? temp - dewPoint : null

  // Visibility score
  const visScore = visKm >= 10 ? 100 : visKm >= 5 ? 80 : visKm >= 2 ? 55 : visKm >= 0.5 ? 25 : 0
  const visRisk = visKm >= 10 ? 'Visibilidad perfecta' : visKm >= 5 ? 'Visibilidad buena' : visKm >= 2 ? 'Visibilidad reducida' : visKm >= 0.5 ? 'Neblina — reduce velocidad' : 'Niebla densa — precaución máxima'

  // Wind/crosswind score
  const windScore = wind < 20 ? 100 : wind < 40 ? 80 : wind < 60 ? 55 : wind < 80 ? 25 : 5
  const windRisk = wind < 20 ? 'Sin riesgo por viento' : wind < 40 ? 'Viento leve' : wind < 60 ? 'Viento fuerte — precaución en zonas abiertas' : 'Viento muy fuerte — peligroso para vehículos altos'

  // Ice/frost risk score
  const iceRisk = temp <= 0 ? 5 : temp <= 2 ? 20 : temp <= 4 ? 55 : dewSpread !== null && dewSpread < 2 && temp < 8 ? 40 : 100
  const iceRiskLabel = temp <= 0 ? 'Posible hielo en calzada' : temp <= 2 ? 'Riesgo de hielo — extrema precaución' : temp <= 4 ? 'Temperatura próxima a punto de congelación' : dewSpread !== null && dewSpread < 2 ? 'Neblina posible' : 'Sin riesgo de hielo'

  // Precipitation/hydroplaning score
  const rainScore = precip === 0 && precipProb < 20 ? 100 : precipProb < 40 ? 85 : precip < 2 ? 70 : precip < 10 ? 45 : 20
  const rainRisk = precip === 0 && precipProb < 20 ? 'Calzada seca' : precipProb < 40 ? 'Lluvia posible — mantén distancia' : precip < 2 ? 'Lluvia ligera — reduce velocidad' : precip < 10 ? 'Lluvia moderada — riesgo de aquaplaning' : 'Lluvia intensa — precaución'

  const factors: RiskFactor[] = [
    { label: 'Visibilidad', emoji: '👁', score: visScore, risk: visRisk, color: safeColor(visScore) },
    { label: 'Viento lateral', emoji: '💨', score: windScore, risk: windRisk, color: safeColor(windScore) },
    { label: 'Riesgo de hielo', emoji: '❄', score: iceRisk, risk: iceRiskLabel, color: safeColor(iceRisk) },
    { label: 'Lluvia/aquaplaning', emoji: '🌧', score: rainScore, risk: rainRisk, color: safeColor(rainScore) },
  ]

  const overall = Math.round(factors.reduce((s, f) => s + f.score, 0) / factors.length)
  const overallColor = safeColor(overall)
  const overallLabel = overall >= 85 ? 'Óptimas' : overall >= 65 ? 'Buenas' : overall >= 45 ? 'Precaución' : overall >= 25 ? 'Riesgo' : 'Peligroso'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🚗 Condiciones de Manejo</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: overallColor, borderColor: overallColor + '44', background: overallColor + '1a'
        }}>
          {overallLabel}
        </span>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl font-bold tabular-nums" style={{ color: overallColor }}>{overall}</div>
        <div>
          <div className="text-xs text-slate-400">/ 100 seguridad vial</div>
          <div className="h-1.5 w-36 bg-white/5 rounded-full overflow-hidden mt-1.5">
            <div className="h-full rounded-full" style={{ width: `${overall}%`, backgroundColor: overallColor }} />
          </div>
        </div>
      </div>

      {overall < 50 && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          ⚠ Condiciones desfavorables. Considera posponer viajes no esenciales o conduce con extrema precaución.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {factors.map(f => (
          <div key={f.label} className="bg-white/5 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span>{f.emoji}</span>
              <span className="text-xs font-semibold" style={{ color: f.color }}>{f.score}</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1.5">
              <div className="h-full rounded-full" style={{ width: `${f.score}%`, backgroundColor: f.color }} />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">{f.label}</div>
            <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{f.risk}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[10px] text-slate-700 text-center">
        Basado en visibilidad, viento, temperatura y precipitación actuales
      </div>
    </div>
  )
}
