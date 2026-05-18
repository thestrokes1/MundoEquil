'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

// Simplified PET (Physiological Equivalent Temperature) approximation
// Based on Mayer & Höppe 1987, simplified for web use
function petApprox(tempC: number, rhPct: number, windMs: number, radiation: number): number {
  // Saturation vapor pressure (Tetens)
  const es = 6.1078 * Math.pow(10, (7.5 * tempC) / (237.3 + tempC))
  const ea = (rhPct / 100) * es
  // Mean radiant temperature approximation: solar gain + ambient
  const tmrt = tempC + 4.5 + (radiation / 100) * 0.8
  // PET simplified linear approximation
  const pet = tempC + 0.33 * ea - 0.70 * windMs - 4.00 + 0.025 * (tmrt - tempC)
  return parseFloat(pet.toFixed(1))
}

interface BioclimateLevel {
  label: string
  sensation: string
  color: string
  stress: string
}

function petLevel(pet: number): BioclimateLevel {
  if (pet < 4)   return { label: 'Muy frío',   sensation: 'Estrés por frío muy fuerte',  color: '#818cf8', stress: 'Muy alto' }
  if (pet < 8)   return { label: 'Frío',        sensation: 'Estrés por frío fuerte',      color: '#60a5fa', stress: 'Alto' }
  if (pet < 13)  return { label: 'Fresco',      sensation: 'Estrés por frío moderado',    color: '#38bdf8', stress: 'Moderado' }
  if (pet < 18)  return { label: 'Ligeramente fresco', sensation: 'Estrés leve por frío', color: '#7dd3fc', stress: 'Leve' }
  if (pet < 23)  return { label: 'Confortable', sensation: 'Sin estrés térmico',          color: '#4ade80', stress: 'Ninguno' }
  if (pet < 29)  return { label: 'Ligeramente cálido', sensation: 'Estrés leve por calor',color: '#a3e635', stress: 'Leve' }
  if (pet < 35)  return { label: 'Cálido',      sensation: 'Estrés moderado por calor',   color: '#facc15', stress: 'Moderado' }
  if (pet < 41)  return { label: 'Muy cálido',  sensation: 'Estrés fuerte por calor',     color: '#fb923c', stress: 'Alto' }
  return           { label: 'Extremo',           sensation: 'Estrés muy fuerte por calor', color: '#f87171', stress: 'Muy alto' }
}

// UTCI simplified approximation (Bröde et al. 2012, Table 1 regression constants)
function utciApprox(ta: number, tr: number, va: number, rh: number): number {
  const Pa = rh / 100 * 6.105 * Math.exp(17.27 * ta / (ta + 237.3))
  const d_Tmrt = tr - ta
  return ta + 0.607562052 + -0.0227712343 * ta + 8.06470341e-4 * ta * ta
    + -1.54271372e-4 * ta * ta * ta + 3.81712e-7 * ta * ta * ta * ta
    + -0.0265033825 * d_Tmrt + 1.35868783e-3 * ta * d_Tmrt
    + 2.50403643e-5 * va * d_Tmrt + 3.52165922e-5 * d_Tmrt * d_Tmrt
    + -3.36839301e-5 * ta * d_Tmrt * d_Tmrt
    + -1.74262619e-3 * va + 1.03780296e-4 * va * va
    + 8.96468547e-7 * va * va * va + 2.35213504e-6 * ta * va
    + -4.50648922e-8 * ta * ta * va + 1.9757889e-5 * Pa
    + -9.06922429e-6 * Pa * Pa + 3.01364084e-7 * Pa * Pa * Pa
}

interface UTCILevel {
  label: string
  color: string
  range: string
}

function utciLevel(utci: number): UTCILevel {
  if (utci < -40) return { label: 'Estrés extremo por frío',  color: '#6366f1', range: '<−40' }
  if (utci < -27) return { label: 'Estrés muy fuerte por frío', color: '#818cf8', range: '−40 a −27' }
  if (utci < -13) return { label: 'Estrés fuerte por frío',   color: '#60a5fa', range: '−27 a −13' }
  if (utci < 0)   return { label: 'Estrés moderado por frío', color: '#38bdf8', range: '−13 a 0' }
  if (utci < 9)   return { label: 'Estrés leve por frío',     color: '#7dd3fc', range: '0 a 9' }
  if (utci < 26)  return { label: 'Sin estrés térmico',       color: '#4ade80', range: '9 a 26' }
  if (utci < 32)  return { label: 'Estrés leve por calor',    color: '#a3e635', range: '26 a 32' }
  if (utci < 38)  return { label: 'Estrés moderado por calor',color: '#facc15', range: '32 a 38' }
  if (utci < 46)  return { label: 'Estrés fuerte por calor',  color: '#fb923c', range: '38 a 46' }
  return           { label: 'Estrés muy fuerte por calor',     color: '#f87171', range: '>46' }
}

export function BioclimateCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const T = c.temperature
  const RH = c.humidity
  // wind speed in m/s
  const Va = (c.windSpeed ?? 0) / 3.6
  // Apparent solar radiation proxy from UV index (0–11+ → 0–1100 W/m²)
  const rad = (c.uvIndex ?? 0) * 60
  // Mean radiant temp: rough proxy for clear/cloudy sky
  const Tmrt = T + 4 + (rad / 1000) * 20

  const PET = petApprox(T, RH, Va, rad)
  const UTCI = parseFloat(utciApprox(T, Tmrt, Va, RH).toFixed(1))

  const pet = petLevel(PET)
  const utci = utciLevel(UTCI)

  // PET scale: 4 to 41°C mapped to gauge
  const petPct = Math.min(100, Math.max(0, ((PET - 4) / 37) * 100))
  const utciPct = Math.min(100, Math.max(0, ((UTCI - (-40)) / 86) * 100))

  const hourlyPET = weather.hourly.slice(0, 24).map(h => {
    const v = (h.windSpeed ?? 0) / 3.6
    // HourlyForecast has no uvIndex; use 0 (conservative)
    return {
      time: h.time.slice(11, 16),
      pet: petApprox(h.temperature, h.humidity, v, 0),
    }
  })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌡 Confort Bioclimático</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: pet.color, borderColor: pet.color + '44', background: pet.color + '1a'
        }}>
          {pet.label}
        </span>
      </div>

      {/* PET + UTCI main values */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-slate-500 mb-1">PET (Temp. fisiológica)</div>
          <div className="text-3xl font-bold mb-1" style={{ color: pet.color }}>{PET}°C</div>
          <div className="text-[10px] text-slate-500">{pet.sensation}</div>
          {/* mini gauge */}
          <div className="mt-2 relative h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{
              width: `${petPct}%`,
              background: `linear-gradient(to right, #818cf8, #4ade80, #f87171)`,
            }} />
          </div>
          <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
            <span>4</span><span>23°C</span><span>41</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-slate-500 mb-1">UTCI (Clima universal)</div>
          <div className="text-3xl font-bold mb-1" style={{ color: utci.color }}>{UTCI}°C</div>
          <div className="text-[10px] text-slate-500">{utci.label}</div>
          <div className="mt-2 relative h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{
              width: `${utciPct}%`,
              background: `linear-gradient(to right, #6366f1, #4ade80, #f87171)`,
            }} />
          </div>
          <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
            <span>−40</span><span>9–26°C</span><span>+46</span>
          </div>
        </div>
      </div>

      {/* PET stress level table */}
      <div className="mb-4 text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Estrés actual</div>
      <div className="bg-white/5 rounded-xl px-3 py-2 text-xs flex items-center justify-between">
        <span className="text-slate-400">Nivel de estrés fisiológico</span>
        <span className="font-semibold" style={{ color: pet.color }}>{pet.stress}</span>
      </div>

      {/* 24h PET sparkline */}
      <div className="mt-4">
        <div className="text-[10px] text-slate-600 mb-1">PET cada hora — hoy</div>
        <div className="flex items-end gap-0.5 h-10">
          {hourlyPET.map((h, i) => {
            const lv = petLevel(h.pet)
            const pct = Math.min(100, Math.max(0, ((h.pet - 4) / 37) * 100))
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${h.time}: PET ${h.pet}°C`}>
                <div className="w-full rounded-sm" style={{
                  height: `${Math.max(4, pct * 0.38)}px`,
                  background: lv.color,
                  opacity: 0.8,
                }} />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
          <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
        </div>
      </div>

      <div className="mt-3 text-[10px] text-slate-700 text-center">
        PET: Temperatura Fisiológica Equivalente (DIN EN ISO 7726) · UTCI: Universal Thermal Climate Index
      </div>
    </div>
  )
}
