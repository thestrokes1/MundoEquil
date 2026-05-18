'use client'
import { useLocationStore } from '@/stores/location-store'
import { formatSpeed } from '@/lib/utils'
import { getWindDirection } from '@/lib/weather-codes'
import type { CurrentWeather } from '@/types/weather'

interface Props {
  weather: CurrentWeather
}

export function WindCompass({ weather }: Props) {
  const { speedUnit } = useLocationStore()
  const deg = weather.windDeg
  const dir = getWindDirection(deg)

  const bft = weather.windSpeed < 1 ? 0
    : weather.windSpeed < 6 ? 1
    : weather.windSpeed < 12 ? 2
    : weather.windSpeed < 20 ? 3
    : weather.windSpeed < 29 ? 4
    : weather.windSpeed < 39 ? 5
    : weather.windSpeed < 50 ? 6
    : weather.windSpeed < 62 ? 7
    : weather.windSpeed < 75 ? 8
    : weather.windSpeed < 89 ? 9
    : weather.windSpeed < 103 ? 10
    : weather.windSpeed < 118 ? 11 : 12

  const bftLabels = ['Calma','Ventolina','Brisa ligera','Brisa suave','Brisa moderada','Brisa fresca','Brisa fuerte','Viento fuerte','Temporal','Temporal fuerte','Temporal duro','Temporal violento','Huracán']

  const needleX = 60 + Math.sin((deg * Math.PI) / 180) * 38
  const needleY = 60 - Math.cos((deg * Math.PI) / 180) * 38
  const tailX   = 60 - Math.sin((deg * Math.PI) / 180) * 24
  const tailY   = 60 + Math.cos((deg * Math.PI) / 180) * 24

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Viento</h3>

      <div className="flex items-center gap-6">
        {/* Compass SVG */}
        <div className="shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Outer ring */}
            <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

            {/* Cardinal labels */}
            {[['N', 60, 10], ['S', 60, 114], ['E', 114, 64], ['O', 7, 64]].map(([l, x, y]) => (
              <text key={String(l)} x={Number(x)} y={Number(y)} textAnchor="middle" fontSize="9" fill={l === 'N' ? '#ef4444' : '#64748b'} fontWeight="bold">
                {l}
              </text>
            ))}

            {/* Tick marks */}
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i * 22.5 * Math.PI) / 180
              const r1 = i % 4 === 0 ? 48 : 50
              const x1 = 60 + Math.sin(a) * r1
              const y1 = 60 - Math.cos(a) * r1
              const x2 = 60 + Math.sin(a) * 54
              const y2 = 60 - Math.cos(a) * 54
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={i % 4 === 0 ? 1.5 : 0.8} />
              )
            })}

            {/* Needle tail (opposite direction) */}
            <line x1="60" y1="60" x2={tailX} y2={tailY}
              stroke="#475569" strokeWidth="3" strokeLinecap="round" />

            {/* Needle head */}
            <line x1="60" y1="60" x2={needleX} y2={needleY}
              stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

            {/* Center dot */}
            <circle cx="60" cy="60" r="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="text-3xl font-bold text-slate-100">
              {formatSpeed(weather.windSpeed, speedUnit)}
            </div>
            <div className="text-sm text-slate-400 mt-0.5">
              {dir} · Beaufort {bft}
            </div>
            <div className="text-xs text-slate-500">{bftLabels[bft]}</div>
          </div>

          <div className="space-y-1.5 text-xs">
            {weather.windGust && (
              <div className="flex justify-between">
                <span className="text-slate-500">Ráfagas</span>
                <span className="text-slate-300 font-medium">
                  {formatSpeed(weather.windGust, speedUnit)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Dirección</span>
              <span className="text-slate-300 font-medium">{deg}° {dir}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nubosidad</span>
              <span className="text-slate-300 font-medium">{weather.cloudiness}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Punto de rocío</span>
              <span className="text-slate-300 font-medium">{Math.round(weather.dewPoint)}°</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wind speed bar */}
      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Calma</span><span>Brisa</span><span>Fuerte</span><span>Huracán</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((weather.windSpeed / 120) * 100, 100)}%`,
              background: `linear-gradient(to right, #38bdf8, ${weather.windSpeed > 60 ? '#ef4444' : weather.windSpeed > 30 ? '#f97316' : '#38bdf8'})`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
