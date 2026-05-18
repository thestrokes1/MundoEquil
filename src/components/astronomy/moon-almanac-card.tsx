'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

// Lunar calculations
const SYNODIC_MONTH = 29.530588853
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime()

function moonAge(date: Date): number {
  const elapsed = date.getTime() - KNOWN_NEW_MOON
  const days = elapsed / 86400000
  return ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
}

function moonIllumination(age: number): number {
  return (1 - Math.cos((age / SYNODIC_MONTH) * 2 * Math.PI)) / 2
}

function moonPhaseLabel(age: number): { name: string; emoji: string } {
  const pct = (age / SYNODIC_MONTH) * 100
  if (pct < 1.85)   return { name: 'Luna nueva',            emoji: '🌑' }
  if (pct < 23.15)  return { name: 'Luna creciente',        emoji: '🌒' }
  if (pct < 26.85)  return { name: 'Cuarto creciente',      emoji: '🌓' }
  if (pct < 48.15)  return { name: 'Luna gibosa creciente', emoji: '🌔' }
  if (pct < 51.85)  return { name: 'Luna llena',            emoji: '🌕' }
  if (pct < 73.15)  return { name: 'Luna gibosa menguante', emoji: '🌖' }
  if (pct < 76.85)  return { name: 'Cuarto menguante',      emoji: '🌗' }
  if (pct < 98.15)  return { name: 'Luna menguante',        emoji: '🌘' }
  return                    { name: 'Luna nueva',            emoji: '🌑' }
}

function daysUntilFullMoon(age: number): number {
  const fullMoonAge = SYNODIC_MONTH / 2
  if (age <= fullMoonAge) return parseFloat((fullMoonAge - age).toFixed(1))
  return parseFloat((SYNODIC_MONTH - age + fullMoonAge).toFixed(1))
}

function daysUntilNewMoon(age: number): number {
  return parseFloat((SYNODIC_MONTH - age).toFixed(1))
}

// Simplified moon position (azimuth/altitude) — rough approximation
function moonElevation(lat: number, date: Date, age: number): number {
  // Moon's ecliptic longitude
  const D = (date.getTime() - new Date('2000-01-01T12:00:00Z').getTime()) / 86400000
  const L = (218.316 + 13.176396 * D) % 360
  const M = (134.963 + 13.064993 * D) % 360
  const F = (93.272 + 13.229350 * D) % 360
  const lon = L + 6.289 * Math.sin((M * Math.PI) / 180)
  const lat_moon = 5.128 * Math.sin((F * Math.PI) / 180)
  // rough elevation: simplified
  const decl = lat_moon + 23.45 * Math.sin(((lon - 80) * Math.PI) / 180)
  const hourAngle = ((date.getHours() + date.getMinutes() / 60 - 12) * 15) % 360
  const elev = Math.asin(
    Math.sin((lat * Math.PI) / 180) * Math.sin((decl * Math.PI) / 180) +
    Math.cos((lat * Math.PI) / 180) * Math.cos((decl * Math.PI) / 180) * Math.cos((hourAngle * Math.PI) / 180)
  ) * (180 / Math.PI)
  return parseFloat(elev.toFixed(1))
}

// Tidal influence (semi-diurnal approximation from moon age + hours)
function tidalLevel(age: number, hour: number): number {
  // Spring tides at new/full moon (age=0 or 14.77), neap at quarters (7.38, 22.15)
  const springFactor = Math.cos((age / SYNODIC_MONTH) * 2 * Math.PI)
  // Two high tides per day ~12.42h period
  const tidalOscillation = Math.cos((hour / 12.42) * 2 * Math.PI)
  return parseFloat(((springFactor * 0.6 + 1) * tidalOscillation).toFixed(2))
}

function MoonSVG({ illumination, age }: { illumination: number; age: number }) {
  const isWaxing = age < SYNODIC_MONTH / 2
  const lit = illumination
  // Phase fraction controls the terminator position
  const rx = Math.abs(2 * lit - 1) * 30
  const litSide = isWaxing ? '#f8f8f8' : '#1e293b'
  const darkSide = isWaxing ? '#1e293b' : '#f8f8f8'
  return (
    <svg width={70} height={70} viewBox="0 0 70 70">
      {/* Moon circle */}
      <circle cx={35} cy={35} r={30} fill={darkSide} />
      {/* Lit portion */}
      <ellipse cx={35} cy={35} rx={rx} ry={30} fill={lit > 0.5 ? '#f8f8f8' : litSide} />
      {/* Outer ring */}
      <circle cx={35} cy={35} r={30} fill="none" stroke="#334155" strokeWidth={1} />
    </svg>
  )
}

export function MoonAlmanacCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const now = new Date()
  const age = moonAge(now)
  const illum = moonIllumination(age)
  const phase = moonPhaseLabel(age)
  const daysToFull = daysUntilFullMoon(age)
  const daysToNew = daysUntilNewMoon(age)
  const elevation = moonElevation(location.lat, now, age)
  const illumPct = Math.round(illum * 100)

  // Next 7 days phase summary
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000)
    const a = moonAge(d)
    const il = moonIllumination(a)
    const ph = moonPhaseLabel(a)
    return {
      day: d.toLocaleDateString('es-MX', { weekday: 'short' }),
      illumination: Math.round(il * 100),
      emoji: ph.emoji,
      name: ph.name,
    }
  })

  // 24h tidal curve
  const tidalData = Array.from({ length: 25 }, (_, i) => ({
    h: `${String(i).padStart(2, '0')}:00`,
    tide: tidalLevel(age, i),
  }))

  const isSpringTide = illumPct > 90 || illumPct < 10
  const isNeapTide = illumPct > 40 && illumPct < 60

  const moonriseStr = weather.daily[0]?.sunrise  // reuse sunrise time as proxy, real moonrise would need ephemeris

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">🌙 Almanaque Lunar</h3>

      {/* Main moon display */}
      <div className="flex items-center gap-5 mb-5">
        <MoonSVG illumination={illum} age={age} />
        <div className="flex-1">
          <div className="text-xl font-bold text-slate-200 mb-0.5">{phase.emoji} {phase.name}</div>
          <div className="text-xs text-slate-500 mb-2">Iluminación: <span className="text-slate-300 font-medium">{illumPct}%</span></div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-white/5 rounded-xl px-2.5 py-1.5">
              <div className="text-slate-600">Edad lunar</div>
              <div className="text-slate-300 font-medium">{age.toFixed(1)} días</div>
            </div>
            <div className="bg-white/5 rounded-xl px-2.5 py-1.5">
              <div className="text-slate-600">Elevación</div>
              <div className="text-slate-300 font-medium">{elevation}°</div>
            </div>
            <div className="bg-white/5 rounded-xl px-2.5 py-1.5">
              <div className="text-slate-600">Luna llena en</div>
              <div className="text-slate-300 font-medium">{daysToFull} días</div>
            </div>
            <div className="bg-white/5 rounded-xl px-2.5 py-1.5">
              <div className="text-slate-600">Luna nueva en</div>
              <div className="text-slate-300 font-medium">{daysToNew} días</div>
            </div>
          </div>
        </div>
      </div>

      {/* Spring/neap tide notice */}
      {isSpringTide && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-sky-400/20 bg-sky-400/10 text-sky-300">
          🌊 Marea viva (spring tide) — mareas de mayor amplitud
        </div>
      )}
      {isNeapTide && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-slate-400/20 bg-slate-400/10 text-slate-300">
          🌊 Marea muerta (neap tide) — mareas de menor amplitud
        </div>
      )}

      {/* Relative tidal curve */}
      <div className="text-[10px] text-slate-600 mb-1">Curva de marea relativa — hoy (aproximación astronómica)</div>
      <div className="flex items-end gap-0.5 h-10 mb-1">
        {tidalData.map((d, i) => {
          const h = Math.max(0, (d.tide + 1) / 2)  // 0–1 range
          const isNow = i === now.getHours()
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full rounded-t-sm" style={{
                height: `${Math.max(2, h * 36)}px`,
                background: isNow ? '#38bdf8' : '#475569',
                opacity: isNow ? 1 : 0.6,
              }} />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[8px] text-slate-700">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
      </div>

      {/* 7-day phase strip */}
      <div className="mt-4">
        <div className="text-[10px] text-slate-600 mb-2">Fases próximos 7 días</div>
        <div className="grid grid-cols-7 gap-1">
          {nextDays.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-slate-600 capitalize">{d.day}</span>
              <span className="text-xl">{d.emoji}</span>
              <span className="text-[8px] text-slate-600">{d.illumination}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 text-[9px] text-slate-700 text-center">
        Ciclo sinódico: {SYNODIC_MONTH} días · Cálculo: algoritmo de Jean Meeus
      </div>
    </div>
  )
}
