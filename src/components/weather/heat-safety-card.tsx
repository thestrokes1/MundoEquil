'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'

// Stull 2011 approximation for wet-bulb temperature
function wetBulb(tempC: number, rhPct: number): number {
  const T = tempC
  const RH = rhPct
  return (
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035
  )
}

// WBGT approximation (simplified outdoor WBGT ≈ 0.7 Tw + 0.2 Tg + 0.1 T)
// Since we don't have globe temp, use Tw as proxy
function wbgtFromWetBulb(tw: number, ta: number): number {
  return 0.7 * tw + 0.3 * ta
}

interface HeatLevel {
  label: string
  color: string
  advice: string
}

function heatStressLevel(wbgt: number): HeatLevel {
  if (wbgt < 26) return { label: 'Sin riesgo', color: '#4ade80', advice: 'Actividad física normal permitida' }
  if (wbgt < 28) return { label: 'Precaución', color: '#a3e635', advice: 'Descansos regulares y buena hidratación' }
  if (wbgt < 30) return { label: 'Moderado', color: '#facc15', advice: 'Pauses de 15 min cada hora, hidratación frecuente' }
  if (wbgt < 32) return { label: 'Alto', color: '#fb923c', advice: 'Limitar trabajo intenso, hidratarse cada 15-20 min' }
  if (wbgt < 35) return { label: 'Muy alto', color: '#f87171', advice: 'Solo actividades ligeras, supervisión médica recomendada' }
  return { label: 'Extremo', color: '#e879f9', advice: 'Suspender actividad al aire libre. Riesgo de muerte' }
}

// Heat index (Steadman) for temp > 27°C and RH > 40%
function heatIndex(tempC: number, rh: number): number | null {
  const T = tempC * 9/5 + 32  // to Fahrenheit
  if (T < 80 || rh < 40) return null
  const HI = -42.379 + 2.04901523*T + 10.14333127*rh
    - 0.22475541*T*rh - 0.00683783*T*T
    - 0.05481717*rh*rh + 0.00122874*T*T*rh
    + 0.00085282*T*rh*rh - 0.00000199*T*T*rh*rh
  return parseFloat(((HI - 32) * 5/9).toFixed(1))  // back to Celsius
}

export function HeatSafetyCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather) return null

  const c = weather.current
  const T = c.temperature
  const RH = c.humidity

  const Tw = parseFloat(wetBulb(T, RH).toFixed(1))
  const WBGT = parseFloat(wbgtFromWetBulb(Tw, T).toFixed(1))
  const HI = heatIndex(T, RH)

  const heatLevel = heatStressLevel(WBGT)
  const isHighRisk = WBGT >= 30

  // Fluid intake recommendation (ml/hour for moderate activity)
  const fluidMl = WBGT < 26 ? 500 : WBGT < 28 ? 600 : WBGT < 30 ? 750 : WBGT < 32 ? 900 : 1000

  // Hours until safe (if too hot, how long until it cools down)
  const todayHigh = weather.daily[0]?.tempMax ?? T
  const willCool = T >= 30 && todayHigh > 30

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌡 Seguridad Térmica</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: heatLevel.color, borderColor: heatLevel.color + '44', background: heatLevel.color + '1a'
        }}>
          {heatLevel.label}
        </span>
      </div>

      {isHighRisk && (
        <div className="mb-4 px-3 py-2.5 rounded-xl text-xs border" style={{
          background: heatLevel.color + '15', borderColor: heatLevel.color + '35', color: heatLevel.color
        }}>
          ⚠ {heatLevel.advice}
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">Temp. bulbo húmedo</div>
          <div className="font-bold text-lg" style={{ color: heatLevel.color }}>{Tw}°C</div>
          <div className="text-[9px] text-slate-600 mt-0.5">&gt;35°C = límite humano</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">WBGT (estrés térmico)</div>
          <div className="font-bold text-lg" style={{ color: heatLevel.color }}>{WBGT}°C</div>
          <div className="text-[9px] text-slate-600 mt-0.5">&gt;30°C = riesgo alto</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1 text-[10px]">Índice de calor</div>
          <div className="font-bold text-lg text-slate-200">{HI !== null ? `${HI}°C` : '—'}</div>
          <div className="text-[9px] text-slate-600 mt-0.5">Sensación real</div>
        </div>
      </div>

      {/* Fluid recommendation */}
      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-3 py-2.5 mb-3 text-xs">
        <div className="text-sky-300 font-medium mb-0.5">💧 Hidratación recomendada</div>
        <div className="text-slate-400">
          {fluidMl}–{fluidMl + 200} ml/hora durante actividad moderada
        </div>
      </div>

      {/* WBGT scale */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
          <span>Sin riesgo</span><span>Precaución</span><span>Alto</span><span>Extremo</span>
        </div>
        <div className="relative h-2 rounded-full overflow-visible" style={{
          background: 'linear-gradient(to right, #4ade80 0%, #facc15 40%, #fb923c 65%, #f87171 82%, #e879f9 100%)'
        }}>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-slate-900 shadow-lg"
            style={{ left: `calc(${Math.min((WBGT - 20) / 20 * 100, 99)}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-700 mt-0.5">
          <span>20°C</span><span>25°C</span><span>30°C</span><span>35°C</span><span>40°C</span>
        </div>
      </div>

      <div className="mt-3 text-[10px] text-slate-700 text-center">
        WBGT: Wet Bulb Globe Temperature — estándar ISO 7243 para estrés térmico ocupacional
      </div>
    </div>
  )
}
