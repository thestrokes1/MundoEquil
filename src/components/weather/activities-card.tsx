'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData, AirQuality } from '@/types/weather'
import type { PollenData } from '@/app/api/pollen/route'

interface Activity {
  emoji: string
  label: string
  score: number   // 0–100
  reason: string
  color: string
}

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'Ideal',       color: '#4ade80' }
  if (score >= 60) return { text: 'Bueno',        color: '#86efac' }
  if (score >= 40) return { text: 'Aceptable',    color: '#facc15' }
  if (score >= 20) return { text: 'Limitado',     color: '#fb923c' }
  return                   { text: 'No recomendado', color: '#f87171' }
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1 bg-white/5 rounded-full overflow-hidden w-full mt-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  )
}

export function ActivitiesCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()

  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])
  const airQuality = qc.getQueryData<AirQuality>(['air-quality', location?.lat, location?.lon])
  const pollen = qc.getQueryData<PollenData>(['pollen', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const today = weather.daily[0]
  const temp = c.temperature
  const feelsLike = c.feelsLike
  const wind = c.windSpeed
  const uv = c.uvIndex
  const humidity = c.humidity
  const precipProb = today.precipitationProbability
  const aqi = airQuality?.aqi ?? 0

  const mainPollen = pollen?.current
    ? Math.max(
        pollen.current.grassPollen ?? 0,
        pollen.current.birchPollen ?? 0,
        pollen.current.olivePollen ?? 0,
      )
    : 0

  // ---- Running ----
  const runTemp = temp >= 5 && temp <= 25 ? 100 : temp < 5 ? Math.max(0, 100 - (5 - temp) * 10) : Math.max(0, 100 - (temp - 25) * 8)
  const runWind = wind < 20 ? 100 : Math.max(0, 100 - (wind - 20) * 3)
  const runRain = precipProb < 20 ? 100 : Math.max(0, 100 - (precipProb - 20) * 2)
  const runAqi = aqi <= 50 ? 100 : aqi <= 100 ? 70 : aqi <= 150 ? 30 : 0
  const runScore = Math.round((runTemp * 0.4 + runWind * 0.2 + runRain * 0.2 + runAqi * 0.2))
  const runReason = temp < 5 ? 'Frío para correr' : temp > 30 ? 'Demasiado calor' : wind > 30 ? 'Viento fuerte' : precipProb > 60 ? 'Lluvia probable' : aqi > 100 ? 'Calidad del aire regular' : 'Condiciones favorables'

  // ---- Cycling ----
  const cycleWind = wind < 15 ? 100 : Math.max(0, 100 - (wind - 15) * 4)
  const cycleScore = Math.round((runTemp * 0.35 + cycleWind * 0.35 + runRain * 0.15 + runAqi * 0.15))
  const cycleReason = wind > 30 ? 'Viento excesivo para ciclismo' : cycleScore >= 70 ? 'Condiciones ideales' : runReason

  // ---- Outdoor photography ----
  const photoCloud = 100 // We'd need cloud cover data for this, default favorable
  const photoUV = uv >= 1 && uv <= 6 ? 100 : uv > 6 ? 80 : 50
  const photoRain = precipProb < 30 ? 100 : Math.max(0, 100 - (precipProb - 30) * 2)
  const photoScore = Math.round((photoCloud * 0.3 + photoUV * 0.3 + photoRain * 0.4))
  const photoReason = precipProb > 60 ? 'Lluvia probable' : uv < 1 ? 'Poca luz solar' : 'La luz es adecuada'

  // ---- Gardening ----
  const gardenFrost = feelsLike > 2 ? 100 : Math.max(0, feelsLike * 25 + 50)
  const gardenTemp = temp >= 10 && temp <= 30 ? 100 : Math.max(0, 100 - Math.abs(temp - 20) * 5)
  const gardenWind = wind < 25 ? 100 : Math.max(0, 100 - (wind - 25) * 3)
  const gardenScore = Math.round((gardenFrost * 0.3 + gardenTemp * 0.4 + gardenWind * 0.2 + runRain * 0.1))
  const gardenReason = feelsLike < 0 ? 'Riesgo de helada' : temp < 10 ? 'Frío para jardinería' : temp > 33 ? 'Demasiado calor' : 'Buenas condiciones'

  // ---- Beach / Pool ----
  const beachTemp = temp >= 25 ? 100 : temp >= 20 ? 70 : temp >= 15 ? 30 : 0
  const beachUV = uv >= 3 ? 100 : 50
  const beachWind = wind < 20 ? 100 : Math.max(0, 100 - (wind - 20) * 5)
  const beachScore = Math.round((beachTemp * 0.5 + beachUV * 0.2 + beachWind * 0.15 + runRain * 0.15))
  const beachReason = temp < 20 ? 'Temperatura baja para playa' : precipProb > 40 ? 'Lluvia probable' : beachScore >= 70 ? 'Ideal para playa' : 'Condiciones moderadas'

  // ---- Allergy risk ----
  const allergyScore = mainPollen === 0 ? 100 : mainPollen <= 10 ? 80 : mainPollen <= 30 ? 50 : mainPollen <= 80 ? 25 : 0
  const allergyReason = mainPollen === 0 ? 'Sin polen detectado' : mainPollen <= 10 ? 'Polen bajo' : mainPollen <= 30 ? 'Polen moderado' : 'Polen alto, riesgo alérgico'

  const activities: Activity[] = [
    { emoji: '🏃', label: 'Correr',      score: runScore,    reason: runReason,    color: scoreLabel(runScore).color },
    { emoji: '🚴', label: 'Ciclismo',    score: cycleScore,  reason: cycleReason,  color: scoreLabel(cycleScore).color },
    { emoji: '📸', label: 'Fotografía',  score: photoScore,  reason: photoReason,  color: scoreLabel(photoScore).color },
    { emoji: '🌿', label: 'Jardinería',  score: gardenScore, reason: gardenReason, color: scoreLabel(gardenScore).color },
    { emoji: '🏖',  label: 'Playa',       score: beachScore,  reason: beachReason,  color: scoreLabel(beachScore).color },
    { emoji: '🌸', label: 'Alergias',    score: allergyScore, reason: allergyReason, color: scoreLabel(allergyScore).color },
  ]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Actividades al Aire Libre</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {activities.map(act => {
          const sl = scoreLabel(act.score)
          return (
            <div key={act.label} className="bg-white/5 rounded-2xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-base">{act.emoji}</span>
                <span className="text-[10px] font-medium" style={{ color: sl.color }}>{sl.text}</span>
              </div>
              <div className="text-xs font-medium text-slate-300">{act.label}</div>
              <ScoreBar score={act.score} color={act.color} />
              <div className="text-[10px] text-slate-600 leading-tight">{act.reason}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-[10px] text-slate-700 text-center">
        Basado en temperatura, viento, lluvia, UV y calidad del aire actuales
      </div>
    </div>
  )
}
