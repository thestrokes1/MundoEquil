'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

interface MeteorShower {
  name: string
  peak: { month: number; day: number }
  zhr: number           // zenith hourly rate at peak
  parent: string        // parent comet/asteroid
  radiant: string       // constellation
  speed: string         // km/s
  description: string
}

const SHOWERS: MeteorShower[] = [
  { name: 'Cuadrantidas', peak: { month: 1, day: 3 },   zhr: 120, parent: '2003 EH1',    radiant: 'Boyero',   speed: '41',  description: 'Lluvia corta pero intensa, madrugada' },
  { name: 'Líridas',      peak: { month: 4, day: 22 },  zhr: 18,  parent: 'C/1861 G1',   radiant: 'Lira',     speed: '49',  description: 'Fireballs posibles' },
  { name: 'Eta Acuáridas',peak: { month: 5, day: 5 },   zhr: 50,  parent: 'Halley',       radiant: 'Acuario',  speed: '66',  description: 'Mejor en hemisferio sur, rastros largos' },
  { name: 'Perseidas',    peak: { month: 8, day: 12 },  zhr: 100, parent: 'Swift-Tuttle', radiant: 'Perseo',   speed: '59',  description: 'La más popular del verano, fireballs' },
  { name: 'Oriónidas',    peak: { month: 10, day: 21 }, zhr: 20,  parent: 'Halley',       radiant: 'Orión',    speed: '66',  description: 'Meteoros brillantes y rápidos' },
  { name: 'Leónidas',     peak: { month: 11, day: 17 }, zhr: 15,  parent: 'Tempel-Tuttle',radiant: 'Leo',      speed: '71',  description: 'Tormentas históricas cada ~33 años' },
  { name: 'Gemínidas',    peak: { month: 12, day: 13 }, zhr: 150, parent: '3200 Phaethon',radiant: 'Géminis',  speed: '35',  description: 'La más productiva del año, visibles temprano' },
  { name: 'Úrsidas',      peak: { month: 12, day: 22 }, zhr: 10,  parent: 'Tuttle',       radiant: 'Osa Menor',speed: '33',  description: 'Poco conocida pero estable' },
  { name: 'Delta Acuáridas',peak:{ month: 7, day: 30 }, zhr: 20,  parent: '96P/Machholz', radiant: 'Acuario',  speed: '41',  description: 'Mejor observada en trópicos' },
  { name: 'Táuridas',     peak: { month: 11, day: 5 },  zhr: 5,   parent: 'Encke',        radiant: 'Tauro',    speed: '27',  description: 'Conocidas por sus bólidos brillantes' },
  { name: 'Dracónidas',   peak: { month: 10, day: 8 },  zhr: 10,  parent: '21P/Giacobini',radiant: 'Dragón',   speed: '20',  description: 'Muy lentas, visibles al atardecer' },
  { name: 'Capricórnidas',peak: { month: 7, day: 29 },  zhr: 5,   parent: '169P/NEAT',    radiant: 'Capricornio',speed:'23', description: 'Bólidos brillantes amarillos' },
]

function daysUntilPeak(shower: MeteorShower, now: Date): number {
  const year = now.getFullYear()
  let peak = new Date(year, shower.peak.month - 1, shower.peak.day)
  if (peak < now) peak = new Date(year + 1, shower.peak.month - 1, shower.peak.day)
  return Math.ceil((peak.getTime() - now.getTime()) / 86400000)
}

function zhrColor(zhr: number) {
  if (zhr >= 100) return '#fbbf24'
  if (zhr >= 50)  return '#fb923c'
  if (zhr >= 20)  return '#a3e635'
  return '#94a3b8'
}

// Compute moon illumination for peak date
const SYNODIC_MONTH = 29.530588853
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime()
function moonIllumAtDate(d: Date): number {
  const elapsed = d.getTime() - KNOWN_NEW_MOON
  const age = ((elapsed / 86400000 % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
  return Math.round((1 - Math.cos((age / SYNODIC_MONTH) * 2 * Math.PI)) / 2 * 100)
}

export function MeteorShowerCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location) return null

  const now = new Date()
  // Sort by days until peak
  const sorted = SHOWERS
    .map(s => ({ ...s, daysAway: daysUntilPeak(s, now) }))
    .sort((a, b) => a.daysAway - b.daysAway)

  const next = sorted[0]
  const upcoming = sorted.slice(0, 5)

  const nextPeakDate = new Date(now.getTime() + next.daysAway * 86400000)
  const moonAtPeak = moonIllumAtDate(nextPeakDate)
  const moonBad = moonAtPeak > 60

  // Observing conditions tonight
  const clouds = weather?.current.cloudiness ?? 50
  const wind = weather?.current.windSpeed ?? 10
  const observingScore = Math.round(
    (1 - clouds / 100) * 60 + (1 - Math.min(wind, 40) / 40) * 40
  )

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">☄️ Lluvias de Meteoros</h3>

      {/* Next shower highlight */}
      <div className="mb-4 p-4 rounded-2xl border" style={{
        borderColor: zhrColor(next.zhr) + '44',
        background: zhrColor(next.zhr) + '0f',
      }}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-slate-200">{next.name}</span>
          <span className="text-xs font-semibold" style={{ color: zhrColor(next.zhr) }}>
            ZHR: {next.zhr}/h
          </span>
        </div>
        <div className="text-xs text-slate-400 mb-2">{next.description}</div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <div className="text-slate-600">Pico</div>
            <div className="text-slate-300 font-medium">
              {next.daysAway === 0 ? '¡Esta noche!' :
               next.daysAway === 1 ? 'Mañana' :
               `en ${next.daysAway} días`}
            </div>
          </div>
          <div>
            <div className="text-slate-600">Radiante</div>
            <div className="text-slate-300 font-medium">{next.radiant}</div>
          </div>
          <div>
            <div className="text-slate-600">Velocidad</div>
            <div className="text-slate-300 font-medium">{next.speed} km/s</div>
          </div>
        </div>
        {moonBad && (
          <div className="mt-2 text-[10px] text-amber-400">
            🌙 Luna {moonAtPeak}% iluminada — interferirá con la observación
          </div>
        )}
        <div className="text-[10px] text-slate-600 mt-1">Cuerpo padre: {next.parent}</div>
      </div>

      {/* Tonight's observing score */}
      <div className="mb-4 bg-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs">
        <div>
          <div className="text-slate-400 font-medium">Condiciones esta noche</div>
          <div className="text-[10px] text-slate-600 mt-0.5">Nubes {clouds}% · Viento {wind} km/h</div>
        </div>
        <div className="text-2xl font-bold" style={{ color:
          observingScore >= 70 ? '#4ade80' : observingScore >= 45 ? '#facc15' : '#f87171'
        }}>
          {observingScore}
        </div>
      </div>

      {/* Upcoming showers list */}
      <div className="text-[10px] text-slate-600 mb-2">Próximas 5 lluvias del año</div>
      <div className="space-y-1.5">
        {upcoming.map((s, i) => {
          const peakDate = new Date(now.getTime() + s.daysAway * 86400000)
          const peakDateStr = peakDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
          const moon = moonIllumAtDate(peakDate)
          return (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl text-xs">
              <div className="flex-1">
                <span className="font-medium text-slate-300">{s.name}</span>
                <span className="text-slate-600 ml-2 text-[10px]">{peakDateStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">🌙 {moon}%</span>
                <span className="font-bold text-[11px]" style={{ color: zhrColor(s.zhr) }}>
                  {s.zhr}/h
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ZHR legend */}
      <div className="mt-3 flex gap-3 text-[9px] text-slate-700">
        <span><span className="text-yellow-400 font-bold">★</span> ≥100/h excepcional</span>
        <span><span className="text-orange-400 font-bold">★</span> ≥50/h muy buena</span>
        <span><span className="text-lime-400 font-bold">★</span> ≥20/h buena</span>
      </div>
    </div>
  )
}
