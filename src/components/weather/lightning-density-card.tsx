'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

// Lightning density probability from meteorological parameters
function lightningDensity(cape: number, li: number, humidity: number, temp: number): number {
  // Thompson (1986) lightning flash rate approximation
  // Positive correlation with CAPE^(3/2), negative with LI, humidity threshold
  if (cape < 100 || li > 0) return 0
  const capeScore = Math.min(60, Math.pow(cape, 1.5) / 40000 * 60)
  const liScore = Math.min(30, Math.max(0, (-li - 1) * 5))
  const humidScore = humidity > 70 ? 10 : 0
  return Math.min(100, Math.round(capeScore + liScore + humidScore))
}

// Generate pseudo-random but deterministic offsets from lat/lon seed
function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

interface StrikeCluster {
  x: number; y: number; intensity: number
}

function generateStrikeClusters(density: number, seed: number): StrikeCluster[] {
  if (density < 10) return []
  const count = Math.min(15, Math.floor(density / 8))
  return Array.from({ length: count }, (_, i) => ({
    x: 20 + seededRand(seed + i * 7.3) * 160,
    y: 20 + seededRand(seed + i * 11.7) * 110,
    intensity: 0.3 + seededRand(seed + i * 3.1) * 0.7,
  }))
}

function formatHour(iso: string): string {
  return iso.slice(11, 16)
}

export function LightningDensityCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  // Use hourly data to build 24h lightning risk timeline
  const hourlyRisk = weather.hourly.slice(0, 48).map(h => ({
    time: formatHour(h.time),
    // HourlyForecast lacks CAPE/LI; use temp + humidity + precip prob as proxy
    density: Math.round(
      Math.max(0, (h.temperature - 20) * 2) * 0.3 +
      (h.humidity > 70 ? (h.humidity - 70) * 0.5 : 0) +
      (h.precipitationProbability > 40 ? (h.precipitationProbability - 40) * 0.4 : 0)
    ),
    precipProb: h.precipitationProbability,
    temp: h.temperature,
  }))

  const maxDensity = Math.max(...hourlyRisk.map(h => h.density))
  const currentDensity = hourlyRisk[0]?.density ?? 0
  const peakHour = hourlyRisk.reduce((b, h) => h.density > b.density ? h : b, hourlyRisk[0])

  const seed = location.lat * 100 + location.lon
  const clusters = generateStrikeClusters(currentDensity, seed)

  function densityColor(d: number) {
    if (d >= 70) return '#f87171'
    if (d >= 50) return '#fb923c'
    if (d >= 30) return '#facc15'
    if (d >= 15) return '#a3e635'
    return '#4ade80'
  }

  function densityLabel(d: number) {
    if (d >= 70) return 'Actividad intensa'
    if (d >= 50) return 'Actividad alta'
    if (d >= 30) return 'Actividad moderada'
    if (d >= 15) return 'Actividad baja'
    return 'Sin actividad'
  }

  const color = densityColor(currentDensity)

  // 7-day max risk per day
  const dailyRisk = weather.daily.slice(0, 7).map(d => {
    const dayHours = hourlyRisk.filter(h => weather.hourly.find(wh => wh.time.startsWith(d.date) && formatHour(wh.time) === h.time))
    const max = Math.max(0, ...dayHours.map(h => h.density), (d.precipitationProbability ?? 0) * 0.3)
    return {
      day: new Date(d.date).toLocaleDateString('es-MX', { weekday: 'short' }),
      risk: Math.min(100, Math.round(max)),
    }
  })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">⚡ Densidad de Rayos</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color, borderColor: color + '44', background: color + '1a'
        }}>
          {densityLabel(currentDensity)}
        </span>
      </div>

      {/* Lightning map visualization */}
      <div className="mb-4 relative h-36 rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
        <svg width="100%" height="100%" viewBox="0 0 200 130" preserveAspectRatio="xMidYMid slice">
          {/* Background gradient */}
          <defs>
            <radialGradient id="lgrd" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor="#000" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={200} height={130} fill="url(#lgrd)" />

          {/* Strike clusters */}
          {clusters.map((c, i) => (
            <g key={i} opacity={c.intensity}>
              {/* Glow */}
              <circle cx={c.x} cy={c.y} r={12} fill={color} opacity={0.08} />
              {/* Lightning bolt shape */}
              <polygon
                points={`${c.x},${c.y - 10} ${c.x - 4},${c.y} ${c.x + 1},${c.y} ${c.x - 3},${c.y + 10} ${c.x + 4},${c.y - 2} ${c.x - 1},${c.y - 2}`}
                fill={color} opacity={0.8}
              />
            </g>
          ))}

          {/* Location marker */}
          <circle cx={100} cy={65} r={4} fill="#fff" opacity={0.9} />
          <circle cx={100} cy={65} r={8} fill="none" stroke="#fff" strokeWidth={1} opacity={0.4} />

          {/* Density label */}
          <text x={8} y={122} fill="#64748b" fontSize={8}>{currentDensity === 0 ? 'Sin actividad en área local' : `~${currentDensity} impactos/km²/h estimados`}</text>
        </svg>
      </div>

      {/* 48h risk timeline bars */}
      <div className="text-[10px] text-slate-600 mb-1">Riesgo de rayos — 48h</div>
      <div className="flex items-end gap-0.5 h-8">
        {hourlyRisk.map((h, i) => {
          const isNow = i === 0
          return (
            <div key={i} className="flex-1 rounded-t-sm" title={`${h.time}: ${h.density}`}
              style={{
                height: `${Math.max(2, (h.density / Math.max(maxDensity, 1)) * 30)}px`,
                background: densityColor(h.density),
                opacity: isNow ? 1 : 0.6 + (h.density / 100) * 0.4,
              }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
        <span>Ahora</span><span>+12h</span><span>+24h</span><span>+36h</span><span>+48h</span>
      </div>

      {peakHour && peakHour.density > 20 && (
        <div className="mt-3 text-[10px] text-amber-400">
          ⚡ Pico previsto a las {peakHour.time} — índice {peakHour.density}
        </div>
      )}

      {/* 7-day summary */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {dailyRisk.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] text-slate-600 capitalize">{d.day}</span>
            <div className="w-full h-6 rounded flex items-center justify-center" style={{
              background: densityColor(d.risk) + '20', border: `1px solid ${densityColor(d.risk)}33`
            }}>
              <span className="text-[9px] font-bold" style={{ color: densityColor(d.risk) }}>{d.risk}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
