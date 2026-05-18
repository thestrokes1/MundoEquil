'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// Wind power density: P = 0.5 * rho * A * v³
// Air density at sea level: 1.225 kg/m³
// Power coefficient (Betz limit ~0.59, realistic ~0.35-0.45)

const AIR_DENSITY = 1.225  // kg/m³
const Cp = 0.40           // power coefficient (realistic)

function windPower(vMs: number, rotorDiameterM = 10): number {
  // kW output for given rotor diameter
  const A = Math.PI * (rotorDiameterM / 2) ** 2
  return parseFloat((0.5 * AIR_DENSITY * A * Math.pow(vMs, 3) * Cp / 1000).toFixed(2))
}

function windPowerNorm(vKmh: number): number {
  // Normalized 0–100 capacity factor for small turbine, cut-in 3m/s, rated 12m/s
  const vMs = vKmh / 3.6
  if (vMs < 3) return 0
  if (vMs > 25) return 0   // cut-out
  if (vMs >= 12) return 100
  return Math.round(((vMs - 3) / 9) ** 3 * 100)
}

// Wind shear extrapolation (power law): v2 = v1 * (h2/h1)^alpha
function shearExtrapolate(v10: number, h2: number, alpha = 0.143): number {
  return parseFloat((v10 * Math.pow(h2 / 10, alpha)).toFixed(1))
}

function vColor(vKmh: number) {
  if (vKmh < 10) return '#64748b'
  if (vKmh < 20) return '#38bdf8'
  if (vKmh < 30) return '#4ade80'
  if (vKmh < 45) return '#fbbf24'
  return '#f87171'
}

export function WindEnergyCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const v10 = weather.current.windSpeed  // km/h at 10m
  const v10Ms = v10 / 3.6
  const v50 = shearExtrapolate(v10, 50)
  const v100 = shearExtrapolate(v10, 100)
  const v50Ms = v50 / 3.6

  // Power at different scales
  const smallTurbine = windPower(v10Ms, 3)      // 3m diameter, ~1kW rated
  const mediumTurbine = windPower(v50Ms, 10)    // 10m diameter, ~10kW rated
  const capacityFactor = windPowerNorm(v10)

  // 48h wind trend from hourly data
  const hourlyWind = weather.hourly.slice(0, 48).map(h => ({
    time: h.time.slice(11, 16),
    v10: h.windSpeed,
    v100: shearExtrapolate(h.windSpeed, 100),
    cf: windPowerNorm(h.windSpeed),
  }))

  const avgWind48h = hourlyWind.reduce((s, h) => s + h.v10, 0) / hourlyWind.length
  const avgCF = hourlyWind.reduce((s, h) => s + h.cf, 0) / hourlyWind.length

  // Beaufort scale
  function beaufort(kmh: number) {
    if (kmh < 2) return { n: 0, label: 'Calma' }
    if (kmh < 12) return { n: 2, label: 'Brisa débil' }
    if (kmh < 20) return { n: 3, label: 'Brisa leve' }
    if (kmh < 29) return { n: 4, label: 'Brisa moderada' }
    if (kmh < 39) return { n: 5, label: 'Brisa fresca' }
    if (kmh < 50) return { n: 6, label: 'Brisa fuerte' }
    if (kmh < 62) return { n: 7, label: 'Viento fuerte' }
    return { n: 8, label: 'Temporal' }
  }

  const bft = beaufort(v10)
  const col = vColor(v10)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">💨 Energía Eólica</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: col, borderColor: col + '44', background: col + '1a'
        }}>
          Bf {bft.n} · {bft.label}
        </span>
      </div>

      {/* Wind at heights */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">10 m</div>
          <div className="font-bold text-xl" style={{ color: vColor(v10) }}>{v10}</div>
          <div className="text-[9px] text-slate-600">km/h</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">50 m (cizalla)</div>
          <div className="font-bold text-xl" style={{ color: vColor(v50) }}>{v50}</div>
          <div className="text-[9px] text-slate-600">km/h</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">100 m</div>
          <div className="font-bold text-xl" style={{ color: vColor(v100) }}>{v100}</div>
          <div className="text-[9px] text-slate-600">km/h</div>
        </div>
      </div>

      {/* Power output */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <div className="text-[10px] text-blue-400 mb-1">Microaerogenerador (∅3m)</div>
          <div className="font-bold text-lg text-blue-300">{smallTurbine} kW</div>
          <div className="text-[9px] text-blue-400/60">Factor de carga: {capacityFactor}%</div>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
          <div className="text-[10px] text-sky-400 mb-1">Aerogenerador pequeño (∅10m)</div>
          <div className="font-bold text-lg text-sky-300">{mediumTurbine} kW</div>
          <div className="text-[9px] text-sky-400/60">a 50m de altura</div>
        </div>
      </div>

      {/* Capacity factor gauge */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Factor de carga promedio 48h</span>
          <span className="font-medium" style={{ color: vColor(avgWind48h) }}>{avgCF.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{
            width: `${avgCF}%`,
            background: `linear-gradient(to right, #38bdf8, #4ade80, #fbbf24)`,
          }} />
        </div>
      </div>

      {/* 48h wind trend */}
      <div className="text-[10px] text-slate-600 mb-1">Velocidad del viento 48h (km/h)</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={hourlyWind} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} interval={7} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v} km/h`, name === 'v10' ? '10m' : '100m']}
            />
            <ReferenceLine y={20} stroke="#4ade80" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={45} stroke="#fbbf24" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line type="monotone" dataKey="v100" stroke="#7dd3fc" strokeWidth={1} dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="v10" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-3 text-[9px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-400 inline-block" /> 10m</span>
        <span className="flex items-center gap-1"><span className="w-3 h-px border-t border-dashed border-blue-300 inline-block" /> 100m (cizalla α=0.143)</span>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        P = ½ρAv³Cp · Cp=0.40 · Ley de potencia de cizalladura del viento (IEC 61400)
      </div>
    </div>
  )
}
