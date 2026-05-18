'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

interface SleepFactor {
  label: string
  score: number
  note: string
  icon: string
}

function sleepScore(temp: number, humidity: number, wind: number, clouds: number, moonIllum: number): number {
  let score = 100
  // Ideal sleep temp: 15–19°C
  if (temp < 10 || temp > 25)   score -= 25
  else if (temp < 14 || temp > 22) score -= 12
  else if (temp < 15 || temp > 19) score -= 5

  // Humidity: 40–60% ideal
  if (humidity > 80) score -= 15
  else if (humidity > 70 || humidity < 30) score -= 8

  // Wind noise
  if (wind > 40) score -= 20
  else if (wind > 25) score -= 10
  else if (wind > 15) score -= 4

  // Moon light
  if (moonIllum > 80) score -= 10
  else if (moonIllum > 50) score -= 4

  return Math.max(0, Math.min(100, score))
}

const SYNODIC_MONTH = 29.530588853
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime()

function moonIllumNow(): number {
  const age = ((Date.now() - KNOWN_NEW_MOON) / 86400000 % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH
  return Math.round((1 - Math.cos((age / SYNODIC_MONTH) * 2 * Math.PI)) / 2 * 100)
}

function parseSunTime(iso: string | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

export function SleepCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const today = weather.daily[0]
  const tonight = weather.hourly.find(h => {
    const hr = parseInt(h.time.slice(11, 13))
    return hr === 22
  }) ?? weather.hourly[weather.hourly.length - 1]

  const moonIllum = moonIllumNow()
  const nightTemp = tonight?.temperature ?? c.temperature
  const nightHumidity = tonight?.humidity ?? c.humidity
  const nightWind = tonight?.windSpeed ?? c.windSpeed

  const score = sleepScore(nightTemp, nightHumidity, nightWind, c.cloudiness, moonIllum)

  const factors: SleepFactor[] = [
    {
      icon: '🌡',
      label: 'Temperatura nocturna',
      score: nightTemp >= 15 && nightTemp <= 19 ? 100 : nightTemp >= 12 && nightTemp <= 22 ? 70 : 40,
      note: `${nightTemp.toFixed(1)}°C (ideal 15–19°C)`,
    },
    {
      icon: '💧',
      label: 'Humedad',
      score: nightHumidity >= 40 && nightHumidity <= 60 ? 100 : nightHumidity > 80 ? 30 : 65,
      note: `${nightHumidity}% (ideal 40–60%)`,
    },
    {
      icon: '💨',
      label: 'Ruido de viento',
      score: nightWind < 10 ? 100 : nightWind < 25 ? 70 : nightWind < 40 ? 40 : 20,
      note: `${nightWind.toFixed(0)} km/h`,
    },
    {
      icon: '🌙',
      label: 'Luminosidad lunar',
      score: moonIllum < 20 ? 100 : moonIllum < 50 ? 80 : moonIllum < 80 ? 60 : 40,
      note: `Luna ${moonIllum}% iluminada`,
    },
  ]

  function scoreColor(s: number) {
    if (s >= 80) return '#4ade80'
    if (s >= 60) return '#a3e635'
    if (s >= 40) return '#facc15'
    return '#f87171'
  }

  const overallColor = scoreColor(score)

  // Sleep schedule recommendation based on sunrise
  const sunriseHour = parseSunTime(today?.sunrise)
  const recommendedBed = sunriseHour !== null ? sunriseHour - 8 : 22
  const recommendedWake = sunriseHour !== null ? sunriseHour + 0.5 : 7
  function toHHMM(h: number): string {
    const hh = Math.floor(((h % 24) + 24) % 24)
    const mm = Math.round((h - Math.floor(h)) * 60)
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  // Circadian notes
  const notes: string[] = []
  if (nightTemp > 22) notes.push('Temperatura elevada — usar ventilador o A/C')
  if (moonIllum > 70) notes.push('Luna brillante — cortinas opacas recomendadas')
  if (nightWind > 30) notes.push('Viento ruidoso — tapar ventanas')
  if (nightHumidity > 75) notes.push('Humedad alta — deshumidificador recomendado')
  if (notes.length === 0) notes.push('Condiciones óptimas para dormir esta noche')

  // 7-night forecast scores
  const weekScores = weather.daily.slice(0, 7).map(d => {
    const nightH = weather.hourly.find(h => h.time.startsWith(d.date) && parseInt(h.time.slice(11, 13)) === 22)
    const nt = nightH?.temperature ?? d.tempMin
    const nh = nightH?.humidity ?? 60
    const nw = nightH?.windSpeed ?? 10
    return {
      day: new Date(d.date).toLocaleDateString('es-MX', { weekday: 'short' }),
      score: sleepScore(nt, nh, nw, 50, moonIllum),
      temp: nt.toFixed(0),
    }
  })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">😴 Calidad del Sueño</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: overallColor, borderColor: overallColor + '44', background: overallColor + '1a'
        }}>
          {score}/100
        </span>
      </div>

      {/* Big score circle */}
      <div className="flex items-center gap-5 mb-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg width={80} height={80} viewBox="0 0 80 80" className="-rotate-90">
            <circle cx={40} cy={40} r={34} fill="none" stroke="#1e293b" strokeWidth={8} />
            <circle cx={40} cy={40} r={34} fill="none" stroke={overallColor} strokeWidth={8}
              strokeDasharray={`${(score / 100) * 213.6} 213.6`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: overallColor }}>{score}</span>
            <span className="text-[8px] text-slate-600">/100</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {notes.map((n, i) => (
            <div key={i} className="text-[11px] text-slate-400">{n}</div>
          ))}
        </div>
      </div>

      {/* Circadian recommendation */}
      <div className="mb-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2.5 text-xs">
        <div className="text-indigo-300 font-medium mb-0.5">🕐 Ritmo circadiano recomendado</div>
        <div className="text-slate-400">
          Acostarse: <strong className="text-slate-300">{toHHMM(recommendedBed)}</strong>
          {' · '}Despertar: <strong className="text-slate-300">{toHHMM(recommendedWake)}</strong>
          {' · '}8h de sueño
        </div>
      </div>

      {/* Factors */}
      <div className="space-y-1.5 mb-4">
        {factors.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-base w-5 flex-shrink-0">{f.icon}</span>
            <span className="text-slate-500 flex-1 text-[10px]">{f.label}</span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${f.score}%`, background: scoreColor(f.score) }} />
            </div>
            <span className="text-[9px] text-slate-500 w-24 text-right truncate">{f.note}</span>
          </div>
        ))}
      </div>

      {/* 7-night outlook */}
      <div className="text-[10px] text-slate-600 mb-1.5">Condiciones nocturnas — 7 días</div>
      <div className="grid grid-cols-7 gap-1">
        {weekScores.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-slate-600 capitalize">{d.day}</span>
            <div className="w-full h-8 rounded-lg flex items-center justify-center" style={{
              background: scoreColor(d.score) + '20', border: `1px solid ${scoreColor(d.score)}33`
            }}>
              <span className="text-[10px] font-bold" style={{ color: scoreColor(d.score) }}>{d.score}</span>
            </div>
            <span className="text-[8px] text-slate-600">{d.temp}°</span>
          </div>
        ))}
      </div>
    </div>
  )
}
