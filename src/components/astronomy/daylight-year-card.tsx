'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocationStore } from '@/stores/location-store'

function computeDaylightHours(lat: number, dayOfYear: number): number {
  // Approximate sunrise/sunset using Spencer's formula
  const B = (2 * Math.PI * (dayOfYear - 1)) / 365
  // Equation of time (hours)
  const EoT = (0.0000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B)
    - 0.014615 * Math.cos(2 * B) - 0.04089 * Math.sin(2 * B)) * (229.18 / 60)
  // Solar declination (radians)
  const decl = 0.006918 - 0.399912 * Math.cos(B) + 0.070257 * Math.sin(B)
    - 0.006758 * Math.cos(2 * B) + 0.000907 * Math.sin(2 * B)
    - 0.002697 * Math.cos(3 * B) + 0.00148 * Math.sin(3 * B)

  const latRad = lat * Math.PI / 180
  const cosHA = -Math.tan(latRad) * Math.tan(decl)

  if (cosHA > 1) return 0  // Polar night
  if (cosHA < -1) return 24 // Midnight sun

  const HA = Math.acos(cosHA)
  return (2 * HA * 180 / Math.PI) / 15  // hours of daylight
}

const MONTHS_ES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const hours = payload[0].value as number
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{label}</div>
      <div className="text-amber-300 font-semibold">{h}h {m}min de luz</div>
    </div>
  )
}

export function DaylightYearCard() {
  const location = useLocationStore(s => s.location)
  if (!location) return null

  const lat = location.lat
  const now = new Date()
  const currentDOY = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)

  // Compute daylight for each day of the year sampled weekly
  const data: { label: string; daylight: number; doy: number }[] = []
  let prevMonth = -1
  for (let doy = 1; doy <= 365; doy += 4) {
    const d = new Date(now.getFullYear(), 0, doy)
    const month = d.getMonth()
    const label = month !== prevMonth ? MONTHS_ES_SHORT[month] : ''
    prevMonth = month
    data.push({ label, daylight: parseFloat(computeDaylightHours(lat, doy).toFixed(2)), doy })
  }

  const currentDaylight = computeDaylightHours(lat, currentDOY)
  const maxDaylight = Math.max(...data.map(d => d.daylight))
  const minDaylight = Math.min(...data.map(d => d.daylight))
  const maxMonth = MONTHS_ES_SHORT[new Date(now.getFullYear(), 0, data.find(d => d.daylight === maxDaylight)?.doy ?? 172).getMonth()]
  const minMonth = MONTHS_ES_SHORT[new Date(now.getFullYear(), 0, data.find(d => d.daylight === minDaylight)?.doy ?? 355).getMonth()]

  const currentH = Math.floor(currentDaylight)
  const currentM = Math.round((currentDaylight - currentH) * 60)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">☀ Horas de Luz por Mes</h3>

      <div className="flex items-center gap-6 mb-4">
        <div>
          <div className="text-2xl font-bold text-amber-300">{currentH}h {currentM}m</div>
          <div className="text-xs text-slate-500">luz solar hoy</div>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="text-center">
            <div className="text-green-400 font-semibold">{maxDaylight.toFixed(1)}h</div>
            <div className="text-slate-600">máx. ({maxMonth})</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 font-semibold">{minDaylight.toFixed(1)}h</div>
            <div className="text-slate-600">mín. ({minMonth})</div>
          </div>
        </div>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="daylightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              domain={[Math.max(0, minDaylight - 1), Math.min(24, maxDaylight + 1)]}
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}h`}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              x={data[Math.floor(currentDOY / 4)]?.doy ? data[Math.floor(currentDOY / 4)]?.label : ''}
              stroke="rgba(251,191,36,0.4)"
              strokeDasharray="3 3"
            />
            <Area
              type="monotone"
              dataKey="daylight"
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#daylightGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[10px] text-slate-700 text-center">
        Calculado para {location.name} ({lat.toFixed(2)}° lat.) · {lat > 0 ? 'Hemisferio Norte' : 'Hemisferio Sur'}
      </div>
    </div>
  )
}
