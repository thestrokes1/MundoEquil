'use client'
import { useLocationStore } from '@/stores/location-store'
import { useWeather } from '@/hooks/use-weather'
import { Skeleton } from '@/components/ui/skeleton'

interface ClothingItem {
  emoji: string
  name: string
  reason: string
}

function getClothingRecommendations(
  feelsLike: number,
  precipitation: number,
  windSpeed: number,
  uvIndex: number,
  humidity: number,
): ClothingItem[] {
  const items: ClothingItem[] = []

  // Base layer by temperature
  if (feelsLike >= 30) {
    items.push({ emoji: '👕', name: 'Camiseta ligera', reason: `Calor intenso (${Math.round(feelsLike)}°C)` })
  } else if (feelsLike >= 20) {
    items.push({ emoji: '👔', name: 'Camisa / Blusa', reason: `Temperatura agradable` })
  } else if (feelsLike >= 10) {
    items.push({ emoji: '🧥', name: 'Chaqueta ligera', reason: `Temperatura fresca (${Math.round(feelsLike)}°C)` })
  } else if (feelsLike >= 0) {
    items.push({ emoji: '🧣', name: 'Abrigo y bufanda', reason: `Frío (${Math.round(feelsLike)}°C)` })
  } else {
    items.push({ emoji: '🧤', name: 'Ropa de invierno', reason: `Muy frío — ${Math.round(feelsLike)}°C` })
  }

  // Bottom layer
  if (feelsLike >= 25) {
    items.push({ emoji: '🩳', name: 'Shorts / Falda', reason: 'Día caluroso' })
  } else if (feelsLike >= 12) {
    items.push({ emoji: '👖', name: 'Pantalón ligero', reason: 'Temperatura templada' })
  } else {
    items.push({ emoji: '🩱', name: 'Ropa interior térmica', reason: 'Frío extremo' })
  }

  // Footwear
  if (precipitation > 2 || precipitation >= 1) {
    items.push({ emoji: '🥾', name: 'Botas impermeables', reason: 'Lluvia esperada' })
  } else if (feelsLike >= 25) {
    items.push({ emoji: '👟', name: 'Sandalias / Zapatillas ligeras', reason: 'Día caluroso' })
  } else {
    items.push({ emoji: '👟', name: 'Calzado cerrado', reason: 'Temperatura moderada' })
  }

  // Rain gear
  if (precipitation > 0) {
    items.push({ emoji: '☂️', name: 'Paraguas', reason: `Precipitación: ${precipitation}%` })
  }

  // Sun protection
  if (uvIndex >= 5) {
    items.push({ emoji: '🧴', name: 'Protector solar', reason: `UV ${uvIndex} — ${uvIndex >= 8 ? 'muy alto' : 'moderado'}` })
  }
  if (uvIndex >= 7) {
    items.push({ emoji: '🕶️', name: 'Lentes de sol', reason: 'UV alto' })
    items.push({ emoji: '👒', name: 'Sombrero', reason: 'Protección solar adicional' })
  }

  // Wind
  if (windSpeed >= 40) {
    items.push({ emoji: '🧥', name: 'Cortavientos', reason: `Viento fuerte: ${Math.round(windSpeed)} km/h` })
  }

  // Humidity
  if (humidity >= 80 && feelsLike >= 20) {
    items.push({ emoji: '💧', name: 'Ropa transpirable', reason: `Humedad alta: ${humidity}%` })
  }

  return items
}

export function ClothingCard() {
  const location = useLocationStore(s => s.location)
  const { data: weather, isLoading } = useWeather(location)

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16 bg-white/10 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (!weather) return null

  const c = weather.current
  const today = weather.daily[0]
  const items = getClothingRecommendations(
    c.feelsLike,
    today.precipitationProbability,
    c.windSpeed,
    c.uvIndex,
    c.humidity,
  )

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">¿Qué llevar hoy?</h3>
        <span className="text-xs text-slate-500">Sensación: {Math.round(c.feelsLike)}°C</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item, i) => (
          <div key={i} className="bg-white/5 rounded-2xl p-3 flex flex-col gap-1">
            <div className="text-2xl">{item.emoji}</div>
            <div className="text-xs font-medium text-slate-300 leading-snug">{item.name}</div>
            <div className="text-[10px] text-slate-600 leading-snug">{item.reason}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
