'use client'
import { Droplets } from 'lucide-react'
import { formatTemp } from '@/lib/utils'
import { useLocationStore } from '@/stores/location-store'
import type { CurrentWeather } from '@/types/weather'

interface Props {
  weather: CurrentWeather
}

function GaugeBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-medium">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function getHumidityLabel(h: number): { label: string; desc: string } {
  if (h < 25)  return { label: 'Muy seco', desc: 'Ambiente muy seco, puede irritar piel y vías respiratorias.' }
  if (h < 40)  return { label: 'Seco', desc: 'Humedad baja pero confortable. Buena para actividades.' }
  if (h < 60)  return { label: 'Confortable', desc: 'Nivel ideal de humedad para el ser humano.' }
  if (h < 75)  return { label: 'Húmedo', desc: 'Puede sentirse algo pesado. Transpiración menos efectiva.' }
  if (h < 90)  return { label: 'Muy húmedo', desc: 'Sensación opresiva. El calor se siente más intenso.' }
  return          { label: 'Saturado', desc: 'Humedad extrema. Riesgo de golpe de calor si hace calor.' }
}

export function HumidityCard({ weather }: Props) {
  const { unit } = useLocationStore()
  const { label, desc } = getHumidityLabel(weather.humidity)

  const heatIndex = weather.temperature > 27
    ? -8.78469475556 + 1.61139411 * weather.temperature + 2.33854883889 * weather.humidity
      - 0.14611605 * weather.temperature * weather.humidity
      - 0.012308094 * weather.temperature ** 2
      - 0.0164248277778 * weather.humidity ** 2
      + 0.002211732 * weather.temperature ** 2 * weather.humidity
      + 0.00072546 * weather.temperature * weather.humidity ** 2
      - 0.000003582 * weather.temperature ** 2 * weather.humidity ** 2
    : null

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Droplets className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Humedad y Rocío</h3>
      </div>

      {/* Main value */}
      <div className="flex items-end gap-4">
        <div>
          <div className="text-5xl font-bold text-slate-100 tabular-nums">{weather.humidity}%</div>
          <div className="text-sm text-sky-400 font-medium mt-1">{label}</div>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">{desc}</p>
        </div>

        <div className="flex-1 space-y-3 pb-1">
          <GaugeBar value={weather.humidity} max={100} label="Humedad relativa" color="bg-sky-400" />
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Punto de rocío</span>
              <span className="text-slate-200 font-medium">{formatTemp(weather.dewPoint, unit)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Presión</span>
              <span className="text-slate-200 font-medium">{Math.round(weather.pressure)} hPa</span>
            </div>
            {heatIndex !== null && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Índice de calor</span>
                <span className="text-orange-400 font-medium">{formatTemp(heatIndex, unit)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comfort scale */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-slate-600 flex justify-between">
          <span>Muy seco</span><span>Ideal</span><span>Saturado</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden">
          {['bg-orange-400','bg-yellow-400','bg-emerald-400','bg-sky-400','bg-blue-500','bg-indigo-600'].map((c, i) => (
            <div key={i} className={`flex-1 ${c} opacity-${i * 20 + 20}`}
              style={{ opacity: Math.abs(i * 20 - weather.humidity) < 15 ? 1 : 0.25 }} />
          ))}
        </div>
        <div
          className="relative h-1"
          style={{ paddingLeft: `${Math.min(weather.humidity, 98)}%` }}
        >
          <div className="w-0.5 h-3 bg-white rounded-full -translate-x-0.5 -translate-y-2" />
        </div>
      </div>
    </div>
  )
}
