'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

interface BeachFactor {
  label: string
  score: number   // 0–100
  note: string
  color: string
}

function factorColor(score: number) {
  if (score >= 80) return '#4ade80'
  if (score >= 60) return '#a3e635'
  if (score >= 40) return '#facc15'
  if (score >= 20) return '#fb923c'
  return '#f87171'
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = factorColor(score)
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

export function BeachCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const today = weather.daily[0]

  // Beach factors
  const T = c.temperature
  const wind = c.windSpeed ?? 0
  const uv = c.uvIndex ?? 0
  const clouds = c.cloudiness ?? 0
  const precipProb = today?.precipitationProbability ?? 0
  const waveCode = today?.weatherCode ?? 0  // rough proxy

  // Temperature score: ideal 25–32°C
  const tempScore = T < 18 ? 0 : T < 22 ? 40 : T < 25 ? 70 : T < 32 ? 100 : T < 36 ? 75 : 40

  // Wind score: ideal < 20 km/h
  const windScore = wind < 10 ? 100 : wind < 20 ? 80 : wind < 30 ? 50 : wind < 40 ? 20 : 0

  // Rain risk
  const rainScore = precipProb < 10 ? 100 : precipProb < 25 ? 80 : precipProb < 50 ? 50 : precipProb < 75 ? 20 : 0

  // Sun/clouds: want some sun but not scorching
  const sunScore = clouds < 20 ? 90 : clouds < 40 ? 100 : clouds < 60 ? 75 : clouds < 80 ? 40 : 20

  // UV safety: ideal 3–6, dangerous >8
  const uvScore = uv < 3 ? 60 : uv < 6 ? 95 : uv < 8 ? 75 : uv < 10 ? 45 : 20

  const overall = Math.round(tempScore * 0.30 + windScore * 0.20 + rainScore * 0.25 + sunScore * 0.15 + uvScore * 0.10)

  const factors: BeachFactor[] = [
    { label: 'Temperatura', score: tempScore, note: `${T}°C`, color: factorColor(tempScore) },
    { label: 'Viento', score: windScore, note: `${wind} km/h`, color: factorColor(windScore) },
    { label: 'Lluvia', score: rainScore, note: `${precipProb}% prob.`, color: factorColor(rainScore) },
    { label: 'Sol', score: sunScore, note: `${clouds}% nubes`, color: factorColor(sunScore) },
    { label: 'Índice UV', score: uvScore, note: `UV ${uv}`, color: factorColor(uvScore) },
  ]

  // 7-day beach scores
  const weekScores = weather.daily.slice(0, 7).map(d => {
    const tS = d.tempMax < 18 ? 0 : d.tempMax < 22 ? 40 : d.tempMax < 25 ? 70 : d.tempMax < 32 ? 100 : 60
    const rS = (d.precipitationProbability ?? 50) < 20 ? 100 : (d.precipitationProbability ?? 50) < 50 ? 60 : 20
    const wS = (d.windSpeedMax ?? 20) < 20 ? 100 : (d.windSpeedMax ?? 20) < 35 ? 60 : 20
    const score = Math.round(tS * 0.40 + rS * 0.35 + wS * 0.25)
    return {
      day: new Date(d.date).toLocaleDateString('es-MX', { weekday: 'short' }),
      score,
      color: factorColor(score),
      maxT: d.tempMax,
    }
  })

  function overallLabel(s: number) {
    if (s >= 85) return { text: 'Perfecto para playa', emoji: '🏖' }
    if (s >= 70) return { text: 'Buenas condiciones', emoji: '😎' }
    if (s >= 55) return { text: 'Aceptable', emoji: '⛱' }
    if (s >= 35) return { text: 'Condiciones regulares', emoji: '🌤' }
    return { text: 'No recomendado', emoji: '⚠️' }
  }

  const verdict = overallLabel(overall)

  // UV protection advice
  const uvAdvice = uv < 3 ? 'SPF 15 suficiente' : uv < 6 ? 'SPF 30 recomendado' : uv < 8 ? 'SPF 50+, sombra 12–16h' : 'SPF 50+, evitar sol directo'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🏖 Condiciones de Playa</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: factorColor(overall), borderColor: factorColor(overall) + '44', background: factorColor(overall) + '1a'
        }}>
          {verdict.emoji} {verdict.text}
        </span>
      </div>

      {/* Overall score ring + breakdown */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-shrink-0">
          <ScoreRing score={overall} size={72} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: factorColor(overall) }}>{overall}</span>
            <span className="text-[8px] text-slate-600">/100</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {factors.map(f => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-20 flex-shrink-0">{f.label}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${f.score}%`, background: f.color }} />
              </div>
              <span className="text-[10px] text-slate-400 w-14 text-right">{f.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* UV protection banner */}
      <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-xs">
        <span className="text-amber-300 font-medium">☀️ Protección solar: </span>
        <span className="text-slate-400">{uvAdvice}</span>
      </div>

      {/* 7-day beach outlook */}
      <div>
        <div className="text-[10px] text-slate-600 mb-2">Índice de playa — 7 días</div>
        <div className="grid grid-cols-7 gap-1">
          {weekScores.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-slate-500 capitalize">{d.day}</span>
              <div className="w-full h-12 rounded-lg flex items-end justify-center pb-1 relative overflow-hidden" style={{
                background: d.color + '20', border: `1px solid ${d.color}33`
              }}>
                <div className="absolute bottom-0 left-0 right-0 rounded-b-lg" style={{
                  height: `${d.score}%`, background: d.color, opacity: 0.25
                }} />
                <span className="text-[10px] font-bold relative z-10" style={{ color: d.color }}>{d.score}</span>
              </div>
              <span className="text-[8px] text-slate-600">{d.maxT}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
