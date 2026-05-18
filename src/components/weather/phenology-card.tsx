'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

// Hemisphere-aware season
function getSeason(month: number, lat: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  const isNorth = lat >= 0
  const meteorMonth = isNorth ? month : ((month + 5) % 12) + 1
  if (meteorMonth >= 3 && meteorMonth <= 5) return 'spring'
  if (meteorMonth >= 6 && meteorMonth <= 8) return 'summer'
  if (meteorMonth >= 9 && meteorMonth <= 11) return 'autumn'
  return 'winter'
}

interface PhenologyEvent {
  category: 'flora' | 'fauna' | 'insectos' | 'aves'
  emoji: string
  name: string
  event: string
  timing: 'pico' | 'inicio' | 'fin' | 'activo'
}

function getEvents(month: number, lat: number, tempMax: number): PhenologyEvent[] {
  const season = getSeason(month, lat)
  const isTropical = Math.abs(lat) < 23.5

  const events: PhenologyEvent[] = []

  if (season === 'spring') {
    events.push(
      { category: 'flora', emoji: '🌸', name: 'Cerezos / frutales', event: 'Floración', timing: 'pico' },
      { category: 'flora', emoji: '🌼', name: 'Dientes de león', event: 'Floración', timing: 'inicio' },
      { category: 'aves', emoji: '🐦', name: 'Aves migratorias', event: 'Llegada', timing: 'inicio' },
      { category: 'insectos', emoji: '🦋', name: 'Mariposas', event: 'Primera aparición', timing: 'inicio' },
      { category: 'fauna', emoji: '🐸', name: 'Ranas', event: 'Época de canto', timing: 'pico' },
    )
  } else if (season === 'summer') {
    events.push(
      { category: 'flora', emoji: '🌻', name: 'Girasoles', event: 'Floración', timing: 'pico' },
      { category: 'insectos', emoji: '🐝', name: 'Abejas / abejorros', event: 'Máxima actividad', timing: 'pico' },
      { category: 'insectos', emoji: '🦗', name: 'Grillos / cigarras', event: 'Canto nocturno', timing: 'pico' },
      { category: 'aves', emoji: '🦅', name: 'Rapaces', event: 'Cría de polluelos', timing: 'activo' },
      { category: 'fauna', emoji: '🦊', name: 'Zorros / mamíferos', event: 'Cachorros independientes', timing: 'activo' },
    )
  } else if (season === 'autumn') {
    events.push(
      { category: 'flora', emoji: '🍂', name: 'Árboles caducifolios', event: 'Cambio de color', timing: 'pico' },
      { category: 'flora', emoji: '🍄', name: 'Hongos y setas', event: 'Fructificación', timing: 'pico' },
      { category: 'aves', emoji: '🦆', name: 'Aves acuáticas', event: 'Migración sur', timing: 'activo' },
      { category: 'insectos', emoji: '🐛', name: 'Orugas', event: 'Capullo / pupa', timing: 'activo' },
      { category: 'fauna', emoji: '🐿', name: 'Ardillas', event: 'Acumulación de reservas', timing: 'pico' },
    )
  } else {
    events.push(
      { category: 'flora', emoji: '🌲', name: 'Coníferas', event: 'Polén en suspensión', timing: 'inicio' },
      { category: 'aves', emoji: '🦉', name: 'Búhos / lechuzas', event: 'Época reproductiva', timing: 'inicio' },
      { category: 'fauna', emoji: '🦌', name: 'Ciervos', event: 'Pelaje de invierno', timing: 'activo' },
      { category: 'flora', emoji: '❄️', name: 'Vegetación', event: 'Letargo / dormancia', timing: 'activo' },
    )
  }

  if (isTropical) {
    events.push(
      { category: 'aves', emoji: '🦜', name: 'Aves tropicales', event: 'Actividad reproductiva', timing: 'activo' },
      { category: 'insectos', emoji: '🦟', name: 'Mosquitos', event: tempMax > 28 ? 'Temporada alta' : 'Actividad moderada', timing: tempMax > 28 ? 'pico' : 'activo' },
    )
  }

  // Temperature-driven additions
  if (tempMax > 25) {
    events.push({ category: 'fauna', emoji: '🐍', name: 'Reptiles', event: 'Máxima actividad', timing: 'pico' })
  }
  if (tempMax < 5) {
    events.push({ category: 'fauna', emoji: '🦔', name: 'Erizos / murciélagos', event: 'Hibernación', timing: 'activo' })
  }

  return events.slice(0, 6)
}

const CAT_COLORS: Record<string, string> = {
  flora:    '#4ade80',
  fauna:    '#fb923c',
  insectos: '#facc15',
  aves:     '#38bdf8',
}

const TIMING_BADGE: Record<string, string> = {
  pico:   'Pico',
  inicio: 'Inicio',
  fin:    'Final',
  activo: 'Activo',
}

export function PhenologyCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const now = new Date()
  const month = now.getMonth() + 1
  const season = getSeason(month, location.lat)

  const SEASON_LABELS = {
    spring: { label: 'Primavera', emoji: '🌱', color: '#4ade80' },
    summer: { label: 'Verano',    emoji: '☀️',  color: '#fbbf24' },
    autumn: { label: 'Otoño',     emoji: '🍂',  color: '#fb923c' },
    winter: { label: 'Invierno',  emoji: '❄️',  color: '#93c5fd' },
  }

  const seasonInfo = SEASON_LABELS[season]
  const events = getEvents(month, location.lat, weather.current.temperature)

  // Group by category
  const grouped: Record<string, PhenologyEvent[]> = {}
  for (const e of events) {
    if (!grouped[e.category]) grouped[e.category] = []
    grouped[e.category].push(e)
  }

  const monthName = now.toLocaleDateString('es-MX', { month: 'long' })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌿 Calendario Fenológico</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: seasonInfo.color, borderColor: seasonInfo.color + '44', background: seasonInfo.color + '1a'
        }}>
          {seasonInfo.emoji} {seasonInfo.label}
        </span>
      </div>

      <div className="text-xs text-slate-500 mb-4 capitalize">
        {monthName} · {Math.abs(location.lat).toFixed(1)}°{location.lat >= 0 ? 'N' : 'S'}
      </div>

      {/* Events */}
      <div className="space-y-2">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-xl">
            <span className="text-xl flex-shrink-0">{e.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-300 truncate">{e.name}</div>
              <div className="text-[10px] text-slate-500">{e.event}</div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border" style={{
                color: CAT_COLORS[e.category], borderColor: CAT_COLORS[e.category] + '44',
                background: CAT_COLORS[e.category] + '15'
              }}>
                {e.category.charAt(0).toUpperCase() + e.category.slice(1)}
              </span>
              <span className="text-[8px] text-slate-600">{TIMING_BADGE[e.timing]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Category legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(CAT_COLORS).map(([cat, color]) => (
          <span key={cat} className="flex items-center gap-1 text-[9px] text-slate-600">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </span>
        ))}
      </div>

      <div className="mt-3 text-[9px] text-slate-700 text-center">
        Eventos basados en fenología climática estacional y latitud
      </div>
    </div>
  )
}
