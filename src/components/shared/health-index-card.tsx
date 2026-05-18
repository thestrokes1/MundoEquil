'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { AirQuality, WeatherData } from '@/types/weather'
import type { PollenData } from '@/app/api/pollen/route'

interface Factor {
  label: string
  emoji: string
  score: number   // 0–100, higher = better
  detail: string
  color: string
}

function scoreColor(s: number): string {
  if (s >= 80) return '#4ade80'
  if (s >= 60) return '#a3e635'
  if (s >= 40) return '#facc15'
  if (s >= 20) return '#fb923c'
  return '#f87171'
}

function radialProgress(score: number, color: string, size = 56): string {
  const r = (size / 2) - 5
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - score / 100)
  return `
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="4"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"/>
  `
}

export function HealthIndexCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()

  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])
  const aq = qc.getQueryData<AirQuality>(['air-quality', location?.lat, location?.lon])
  const pollen = qc.getQueryData<PollenData>(['pollen', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const uv = c.uvIndex
  const temp = c.temperature
  const humidity = c.humidity
  const aqi = aq?.aqi ?? 0
  const mainPollen = pollen?.current
    ? Math.max(pollen.current.grassPollen ?? 0, pollen.current.birchPollen ?? 0, pollen.current.olivePollen ?? 0)
    : 0

  // AQI factor
  const aqiScore = aqi <= 50 ? 100 : aqi <= 100 ? 75 : aqi <= 150 ? 45 : aqi <= 200 ? 20 : 0
  const aqiDetail = aqi <= 50 ? 'Excelente calidad del aire' : aqi <= 100 ? 'Calidad moderada' : aqi <= 150 ? 'Dañino para sensibles' : 'Dañino'

  // UV factor (moderate UV is OK, very high is risky)
  const uvScore = uv <= 2 ? 95 : uv <= 5 ? 85 : uv <= 7 ? 65 : uv <= 10 ? 35 : 10
  const uvDetail = uv <= 2 ? 'UV bajo, sin riesgo' : uv <= 5 ? 'UV moderado, protección básica' : uv <= 7 ? 'UV alto, usa protector solar' : 'UV muy alto, evita exposición'

  // Thermal comfort factor
  const heatFeel = temp >= 18 && temp <= 26 ? 100
    : temp < 5 || temp > 35 ? 20
    : temp < 10 ? 50
    : temp < 18 ? 75
    : 60  // 26–35

  const humidityComfort = humidity >= 30 && humidity <= 60 ? 100
    : humidity < 20 || humidity > 80 ? 30
    : humidity < 30 ? 65
    : 55  // 60–80

  const comfortScore = Math.round((heatFeel * 0.6 + humidityComfort * 0.4))
  const comfortDetail = temp > 35 ? 'Calor extremo' : temp < 5 ? 'Frío extremo' : humidity > 70 ? 'Bochornoso' : 'Temperatura agradable'

  // Pollen factor
  const pollenScore = mainPollen === 0 ? 100 : mainPollen <= 10 ? 85 : mainPollen <= 30 ? 55 : mainPollen <= 80 ? 25 : 5
  const pollenDetail = mainPollen === 0 ? 'Sin riesgo alérgico' : mainPollen <= 10 ? 'Polen bajo' : mainPollen <= 30 ? 'Polen moderado — sensibles precaución' : 'Polen alto — riesgo para alérgicos'

  const factors: Factor[] = [
    { label: 'Calidad del aire', emoji: '💨', score: aqiScore, detail: aqiDetail, color: scoreColor(aqiScore) },
    { label: 'Radiación UV', emoji: '☀', score: uvScore, detail: uvDetail, color: scoreColor(uvScore) },
    { label: 'Confort térmico', emoji: '🌡', score: comfortScore, detail: comfortDetail, color: scoreColor(comfortScore) },
    { label: 'Polen/Alergias', emoji: '🌸', score: pollenScore, detail: pollenDetail, color: scoreColor(pollenScore) },
  ]

  const overallScore = Math.round(factors.reduce((s, f) => s + f.score, 0) / factors.length)
  const overallColor = scoreColor(overallScore)
  const overallLabel = overallScore >= 80 ? 'Excelente' : overallScore >= 60 ? 'Bueno' : overallScore >= 40 ? 'Regular' : overallScore >= 20 ? 'Malo' : 'Peligroso'

  const SIZE = 80
  const r = SIZE / 2 - 7
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - overallScore / 100)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Índice de Salud Ambiental</h3>

      <div className="flex items-center gap-5 mb-5">
        {/* Big radial */}
        <div className="relative shrink-0">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle cx={SIZE/2} cy={SIZE/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
            <circle
              cx={SIZE/2} cy={SIZE/2} r={r} fill="none"
              stroke={overallColor} strokeWidth={6}
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: overallColor }}>{overallScore}</span>
            <span className="text-[9px] text-slate-500">/100</span>
          </div>
        </div>

        <div>
          <div className="text-xl font-semibold" style={{ color: overallColor }}>{overallLabel}</div>
          <div className="text-xs text-slate-500 mt-0.5">Condiciones ambientales generales</div>
          <div className="text-xs text-slate-500">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {factors.map(f => (
          <div key={f.label} className="bg-white/5 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base">{f.emoji}</span>
              <span className="text-xs font-semibold" style={{ color: f.color }}>{f.score}</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1.5">
              <div className="h-full rounded-full" style={{ width: `${f.score}%`, backgroundColor: f.color }} />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">{f.label}</div>
            <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{f.detail}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
