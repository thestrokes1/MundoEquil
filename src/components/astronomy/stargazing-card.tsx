'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'
import type { CloudCoverData } from '@/app/api/cloud-cover/route'
import type { CelestialData } from '@/app/api/celestial/route'

interface Condition {
  label: string
  score: number   // 0–100
  emoji: string
  detail: string
  color: string
}

function condColor(score: number): string {
  if (score >= 80) return '#4ade80'
  if (score >= 60) return '#a3e635'
  if (score >= 40) return '#facc15'
  if (score >= 20) return '#fb923c'
  return '#f87171'
}

export function StargazingCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()

  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])
  const cloudData = qc.getQueryData<CloudCoverData>(['cloud-cover', location?.lat, location?.lon])
  const celestial = qc.getQueryData<CelestialData>(['celestial', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const humidity = c.humidity
  const cloudiness = c.cloudiness  // 0–100

  const moonIllum = celestial?.moon?.illumination ?? 50

  // Cloud cover condition
  const cloudScore = Math.max(0, 100 - cloudiness)
  const cloudDetail = cloudiness < 10 ? 'Cielo despejado — perfecto' : cloudiness < 30 ? 'Pocas nubes' : cloudiness < 60 ? 'Nubes parciales' : 'Muy nublado'

  // Moon condition (lower = better for deep sky)
  const moonScore = moonIllum <= 10 ? 100 : moonIllum <= 30 ? 75 : moonIllum <= 60 ? 45 : moonIllum <= 85 ? 20 : 5
  const moonDetail = moonIllum <= 10 ? 'Luna nueva — ideal' : moonIllum <= 30 ? 'Luna creciente — aceptable' : moonIllum <= 60 ? 'Mucha luz lunar' : 'Luna llena — dificulta observación'

  // Atmospheric stability (low humidity = better seeing)
  const humidScore = humidity <= 40 ? 100 : humidity <= 60 ? 80 : humidity <= 75 ? 55 : humidity <= 90 ? 30 : 10
  const humidDetail = humidity <= 40 ? 'Atmósfera seca — excelente' : humidity <= 60 ? 'Humedad moderada' : humidity <= 80 ? 'Alta humedad, posible neblina' : 'Muy húmedo'

  // Wind condition (calm = better, less atmospheric turbulence)
  const wind = c.windSpeed
  const windScore = wind < 10 ? 100 : wind < 20 ? 80 : wind < 30 ? 55 : 25
  const windDetail = wind < 10 ? 'Calma — excelente seeing' : wind < 20 ? 'Viento suave' : wind < 30 ? 'Viento moderado — turbulencia' : 'Viento fuerte — mala visibilidad'

  const conditions: Condition[] = [
    { label: 'Nubosidad', emoji: '☁', score: cloudScore, detail: cloudDetail, color: condColor(cloudScore) },
    { label: 'Luna', emoji: '🌙', score: moonScore, detail: moonDetail, color: condColor(moonScore) },
    { label: 'Humedad', emoji: '💧', score: humidScore, detail: humidDetail, color: condColor(humidScore) },
    { label: 'Seeing', emoji: '💨', score: windScore, detail: windDetail, color: condColor(windScore) },
  ]

  const overall = Math.round(conditions.reduce((s, c) => s + c.score, 0) / conditions.length)
  const overallColor = condColor(overall)
  const overallLabel = overall >= 80 ? 'Excelente' : overall >= 60 ? 'Buenas' : overall >= 40 ? 'Regulares' : overall >= 20 ? 'Malas' : 'Pésimas'

  // What can you observe?
  const canObserve = overall >= 70 ? ['Objetos de cielo profundo', 'Cúmulos estelares', 'Galaxias brillantes', 'Nebulosas']
    : overall >= 50 ? ['Planetas brillantes', 'Luna (si visible)', 'Estrellas dobles']
    : overall >= 30 ? ['Planetas más brillantes', 'Luna']
    : ['Observación no recomendada']

  const isNight = celestial?.sun ? !celestial.sun.isUp : new Date().getHours() < 6 || new Date().getHours() > 20

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🔭 Condiciones para Observar</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: overallColor, borderColor: overallColor + '44', background: overallColor + '1a'
        }}>
          {overallLabel}
        </span>
      </div>

      {!isNight && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          ☀ El sol está sobre el horizonte. Las condiciones son para esta noche.
        </div>
      )}

      {/* Overall score */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl font-bold tabular-nums" style={{ color: overallColor }}>{overall}</div>
        <div>
          <div className="text-sm font-medium text-slate-300">/ 100 condiciones {overallLabel.toLowerCase()}</div>
          <div className="h-1.5 w-40 bg-white/5 rounded-full overflow-hidden mt-1.5">
            <div className="h-full rounded-full" style={{ width: `${overall}%`, backgroundColor: overallColor }} />
          </div>
        </div>
      </div>

      {/* Factor grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {conditions.map(cond => (
          <div key={cond.label} className="bg-white/5 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span>{cond.emoji}</span>
              <span className="text-xs font-semibold" style={{ color: cond.color }}>{cond.score}</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1.5">
              <div className="h-full rounded-full" style={{ width: `${cond.score}%`, backgroundColor: cond.color }} />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">{cond.label}</div>
            <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{cond.detail}</div>
          </div>
        ))}
      </div>

      {/* What can you see */}
      <div className="px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
        <div className="text-[10px] text-indigo-400 font-medium mb-1.5">✨ Posibles de observar</div>
        <div className="flex flex-wrap gap-1.5">
          {canObserve.map(obj => (
            <span key={obj} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">{obj}</span>
          ))}
        </div>
      </div>

      {moonIllum > 0 && (
        <div className="mt-2 text-[10px] text-slate-700 text-center">
          Luna: {moonIllum}% iluminación · {isNight ? 'Esta noche' : 'Pronóstico'}
        </div>
      )}
    </div>
  )
}
