'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

// Solunar theory (John Knight, 1926):
// Major periods: moonrise + moonset + solar transit + anti-transit (~2h each)
// Minor periods: midpoints between majors (~1h each)

const SYNODIC_MONTH = 29.530588853
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime()
const DEG = Math.PI / 180

function moonAge(d: Date): number {
  const elapsed = d.getTime() - KNOWN_NEW_MOON
  return ((elapsed / 86400000 % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
}

function moonIllum(age: number): number {
  return Math.round((1 - Math.cos((age / SYNODIC_MONTH) * 2 * Math.PI)) / 2 * 100)
}

// Simplified solar transit (solar noon)
function solarNoon(lon: number, date: Date): number {
  const doy = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
  const B = (360 / 365) * (doy - 81)
  const eqTime = 9.87 * Math.sin(2 * B * DEG) - 7.53 * Math.cos(B * DEG) - 1.5 * Math.sin(B * DEG)
  const solarNoonHour = 12 - eqTime / 60 - lon / 15
  return ((solarNoonHour % 24) + 24) % 24
}

// Simplified moonrise hour from lunar age (rough approximation)
function moonriseHour(age: number): number {
  // New moon rises ~6am, full moon ~6pm
  return ((age / SYNODIC_MONTH) * 24 + 6) % 24
}

interface SolunarPeriod {
  start: number   // hour of day (decimal)
  end: number
  type: 'major' | 'minor'
  label: string
}

function toHHMM(h: number): string {
  const hours = Math.floor(((h % 24) + 24) % 24)
  const mins = Math.round((h - Math.floor(h)) * 60)
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function isActive(period: SolunarPeriod, now: Date): boolean {
  const h = now.getHours() + now.getMinutes() / 60
  const s = ((period.start % 24) + 24) % 24
  const e = ((period.end % 24) + 24) % 24
  if (s < e) return h >= s && h < e
  return h >= s || h < e  // crosses midnight
}

export function SolunarCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const now = new Date()
  const age = moonAge(now)
  const illum = moonIllum(age)

  const noon = solarNoon(location.lon, now)
  const antiNoon = (noon + 12) % 24
  const moonrise = moonriseHour(age)
  const moonset = (moonrise + 12.42) % 24

  // Rating: 100% at new/full moon (illum 0 or 100), 50% at quarters
  const moonRating = Math.round(50 + 50 * Math.abs(Math.cos((age / SYNODIC_MONTH) * 2 * Math.PI)))

  // Major periods: 2h windows centered on moonrise, moonset, solar noon, anti-noon
  const majors: SolunarPeriod[] = [
    { start: moonrise - 1, end: moonrise + 1, type: 'major', label: 'Salida de luna' },
    { start: moonset - 1, end: moonset + 1, type: 'major', label: 'Puesta de luna' },
    { start: noon - 1, end: noon + 1, type: 'major', label: 'Tránsito solar' },
    { start: antiNoon - 1, end: antiNoon + 1, type: 'major', label: 'Anti-tránsito solar' },
  ]

  // Minor periods: 1h windows at midpoints
  const minors: SolunarPeriod[] = [
    { start: (moonrise + noon) / 2 - 0.5, end: (moonrise + noon) / 2 + 0.5, type: 'minor', label: 'Período menor' },
    { start: (moonset + antiNoon) / 2 - 0.5, end: (moonset + antiNoon) / 2 + 0.5, type: 'minor', label: 'Período menor' },
  ]

  const periods = [...majors, ...minors].sort((a, b) => {
    const sa = ((a.start % 24) + 24) % 24
    const sb = ((b.start % 24) + 24) % 24
    return sa - sb
  })

  const activePeriod = periods.find(p => isActive(p, now))

  // 24h activity bars (0–100 score per hour)
  const hourlyActivity = Array.from({ length: 24 }, (_, h) => {
    let score = 30  // baseline
    for (const p of majors) {
      const center = ((p.start + 1) % 24 + 24) % 24
      const dist = Math.min(Math.abs(h - center), 24 - Math.abs(h - center))
      score += Math.max(0, 40 * (1 - dist / 3))
    }
    for (const p of minors) {
      const center = ((p.start + 0.5) % 24 + 24) % 24
      const dist = Math.min(Math.abs(h - center), 24 - Math.abs(h - center))
      score += Math.max(0, 20 * (1 - dist / 2))
    }
    return Math.min(100, Math.round(score * moonRating / 100))
  })

  const rating = moonRating >= 80 ? 'Excelente' : moonRating >= 60 ? 'Buena' : moonRating >= 40 ? 'Regular' : 'Baja'
  const ratingColor = moonRating >= 80 ? '#fbbf24' : moonRating >= 60 ? '#4ade80' : moonRating >= 40 ? '#facc15' : '#94a3b8'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🎣 Tablas Solunares</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: ratingColor, borderColor: ratingColor + '44', background: ratingColor + '1a'
        }}>
          {rating} actividad
        </span>
      </div>

      {/* Moon phase + rating */}
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center flex-shrink-0 w-24">
          <div className="text-2xl font-bold" style={{ color: ratingColor }}>{moonRating}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Índice lunar</div>
          <div className="text-[9px] text-slate-600">{illum}% ilum.</div>
        </div>
        <div className="flex-1 text-xs text-slate-400">
          Actividad máxima en luna nueva y llena (iluminación extrema). Mínima en cuartos.
          {moonRating >= 75 && <span className="text-amber-400 block mt-1">★ Condiciones óptimas hoy</span>}
        </div>
      </div>

      {/* Active period indicator */}
      {activePeriod && (
        <div className="mb-4 px-3 py-2.5 rounded-xl text-xs border border-green-500/20 bg-green-500/10 text-green-300">
          ⚡ Período {activePeriod.type === 'major' ? 'mayor' : 'menor'} activo: <strong>{activePeriod.label}</strong>
          {' '}hasta {toHHMM(activePeriod.end)} — actividad elevada
        </div>
      )}

      {/* Period list */}
      <div className="space-y-1.5 mb-4">
        {periods.map((p, i) => {
          const active = isActive(p, now)
          const s = ((p.start % 24) + 24) % 24
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${
              active ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                p.type === 'major' ? 'bg-amber-400' : 'bg-slate-500'
              }`} />
              <span className="text-slate-400 flex-1">{p.label}</span>
              <span className="font-medium text-slate-300">{toHHMM(s)} – {toHHMM(p.end)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                p.type === 'major' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-500/20 text-slate-400'
              }`}>
                {p.type === 'major' ? 'Mayor' : 'Menor'}
              </span>
            </div>
          )
        })}
      </div>

      {/* 24h activity curve */}
      <div className="text-[10px] text-slate-600 mb-1">Índice de actividad por hora</div>
      <div className="flex items-end gap-0.5 h-10">
        {hourlyActivity.map((score, h) => {
          const isNow = h === now.getHours()
          const inPeriod = periods.some(p => {
            const s = ((p.start % 24) + 24) % 24
            const e = ((p.end % 24) + 24) % 24
            return s < e ? h >= s && h < e : h >= s || h < e
          })
          return (
            <div key={h} className="flex-1 rounded-t-sm" title={`${h}h: ${score}%`} style={{
              height: `${Math.max(3, score * 0.38)}px`,
              background: isNow ? '#fbbf24' : inPeriod ? '#4ade80' : '#334155',
              opacity: isNow ? 1 : 0.8,
            }} />
          )
        })}
      </div>
      <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>

      <div className="mt-3 text-[9px] text-slate-700 text-center">
        Teoría solunar de John Knight (1926) · Usada en pesca y observación de fauna silvestre
      </div>
    </div>
  )
}
