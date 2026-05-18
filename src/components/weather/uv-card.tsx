'use client'
import { getUVLabel } from '@/lib/weather-codes'
import type { HourlyForecast } from '@/types/weather'

interface Props {
  uvIndex: number
  uvMax: number
  hourly: HourlyForecast[]
}

const UV_ZONES = [
  { max: 3,  label: 'Bajo',     color: '#22c55e' },
  { max: 6,  label: 'Moderado', color: '#eab308' },
  { max: 8,  label: 'Alto',     color: '#f97316' },
  { max: 11, label: 'Muy alto', color: '#ef4444' },
  { max: 20, label: 'Extremo',  color: '#a855f7' },
]

function uvColor(uv: number): string {
  for (const z of UV_ZONES) {
    if (uv <= z.max) return z.color
  }
  return '#a855f7'
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(x: number, y: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(x, y, r, endDeg)
  const end   = polarToCartesian(x, y, r, startDeg)
  const large = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

export function UVCard({ uvIndex, uvMax }: Props) {
  const { label } = getUVLabel(uvIndex)
  const color = uvColor(uvIndex)
  const pct = Math.min((uvIndex / 12) * 100, 100)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Índice UV</h3>

      <div className="flex items-center gap-6">
        {/* Arc gauge */}
        <div className="relative shrink-0">
          <svg width="120" height="80" viewBox="0 0 120 80">
            <path d={describeArc(60, 70, 50, -150, 30)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
            <path
              d={describeArc(60, 70, 50, -150, -150 + (pct / 100) * 180)}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
            />
            <text x="60" y="68" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white">
              {Math.round(uvIndex)}
            </text>
          </svg>
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <div className="text-lg font-bold" style={{ color }}>{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Actual: {uvIndex.toFixed(1)} · Máx hoy: {uvMax.toFixed(1)}
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {uvIndex <= 2 && 'No se necesita protección solar especial.'}
            {uvIndex > 2 && uvIndex <= 5 && 'Usa protector SPF 30+ si estarás al sol más de 30 min.'}
            {uvIndex > 5 && uvIndex <= 7 && 'SPF 50+, ropa protectora y sombra entre 11am–3pm.'}
            {uvIndex > 7 && uvIndex <= 10 && 'Protección máxima. Evita sol entre 10am–4pm.'}
            {uvIndex > 10 && 'UV extremo — permanece bajo techo si es posible.'}
          </p>

          {/* Color scale bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>0</span><span>3</span><span>6</span><span>8</span><span>11+</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden">
              {UV_ZONES.map((z, i) => (
                <div
                  key={i}
                  className="flex-1 h-full transition-opacity"
                  style={{
                    background: z.color,
                    opacity: uvIndex >= (i === 0 ? 0 : UV_ZONES[i - 1].max) ? 1 : 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
