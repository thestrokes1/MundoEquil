'use client'
import type { CurrentWeather, AirQuality } from '@/types/weather'
import { getAQIInfo } from '@/lib/aqi'
import { cn } from '@/lib/utils'

interface Rec {
  emoji: string
  title: string
  text: string
  good: boolean
}

function buildRecommendations(w: CurrentWeather, aq?: AirQuality): Rec[] {
  const recs: Rec[] = []
  const aqi = aq?.aqi ?? 0
  const aqiInfo = getAQIInfo(aqi)

  // Running / exercise
  const goodForExercise = aqi <= 100 && w.temperature >= 5 && w.temperature <= 32 && w.windSpeed < 40
  recs.push({
    emoji: '🏃',
    title: 'Ejercicio al aire libre',
    text: goodForExercise
      ? 'Buenas condiciones para salir a correr o hacer deporte.'
      : aqi > 100
      ? `AQI ${aqi} — mejor ejercitarse en interiores.`
      : w.temperature > 32
      ? 'Demasiado calor, hidratación extra si sales.'
      : 'Condiciones no ideales hoy.',
    good: goodForExercise,
  })

  // Bike
  const goodForBike = w.windSpeed < 25 && w.cloudiness < 80 && aqi <= 100
  recs.push({
    emoji: '🚴',
    title: 'Bicicleta',
    text: goodForBike
      ? 'Viento suave y visibilidad aceptable — buen día para rodar.'
      : w.windSpeed >= 25
      ? `Viento de ${Math.round(w.windSpeed)} km/h — pedalar será difícil.`
      : 'Considera alternativas hoy.',
    good: goodForBike,
  })

  // Barbecue
  const goodForBBQ = w.windSpeed < 30 && w.cloudiness < 60 && w.humidity < 80
  recs.push({
    emoji: '🍖',
    title: 'Asado / Barbacoa',
    text: goodForBBQ
      ? 'Poca humedad y viento moderado — perfecto para encender el asador.'
      : w.windSpeed >= 30
      ? 'Viento fuerte — el fuego será difícil de controlar.'
      : 'Alta humedad o nublado — no es el mejor día.',
    good: goodForBBQ,
  })

  // Stargazing
  const hour = new Date().getHours()
  const isNight = hour >= 21 || hour <= 5
  const goodForStars = w.cloudiness < 30 && w.humidity < 70
  recs.push({
    emoji: '🔭',
    title: 'Observación de estrellas',
    text: goodForStars
      ? isNight
        ? 'Cielo despejado — excelente noche para observar.'
        : 'Esta noche el cielo estará despejado para observar.'
      : `Nubosidad ${w.cloudiness}% — visibilidad reducida.`,
    good: goodForStars,
  })

  // Umbrella
  const needUmbrella = w.cloudiness > 70 || w.humidity > 85
  recs.push({
    emoji: '☂️',
    title: 'Paraguas',
    text: needUmbrella
      ? 'Cielo muy nublado — lleva paraguas por si acaso.'
      : 'No necesitas paraguas hoy.',
    good: !needUmbrella,
  })

  // Air quality clothing
  recs.push({
    emoji: '😷',
    title: 'Calidad del aire',
    text: aqi <= 50
      ? 'Aire limpio — sin restricciones.'
      : aqi <= 100
      ? 'AQI moderado — personas sensibles precaución.'
      : `AQI ${aqi} (${aqiInfo.label}) — considera cubrebocas al salir.`,
    good: aqi <= 100,
  })

  return recs
}

interface Props {
  weather: CurrentWeather
  airQuality?: AirQuality
}

export function RecommendationsCard({ weather, airQuality }: Props) {
  const recs = buildRecommendations(weather, airQuality)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Recomendaciones de hoy
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {recs.map((r) => (
          <div
            key={r.title}
            className={cn(
              'rounded-2xl p-3 border transition-colors space-y-1.5',
              r.good
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-slate-800/50 border-white/5'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{r.emoji}</span>
              <span className={cn('text-xs font-semibold', r.good ? 'text-emerald-300' : 'text-slate-400')}>
                {r.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
