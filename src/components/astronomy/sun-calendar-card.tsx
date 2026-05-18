'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { ExtendedForecastData } from '@/app/api/forecast-extended/route'

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function daylightMinutes(rise: string | null, set: string | null): number {
  if (!rise || !set) return 0
  return (new Date(set).getTime() - new Date(rise).getTime()) / 60000
}

function minsToHM(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}h ${m}m`
}

function SunArc({ fraction }: { fraction: number }) {
  const W = 48
  const H = 24
  const cx = W / 2
  const ry = H * 0.9
  const rx = W / 2 - 2
  const startAngle = Math.PI
  const endAngle = 0
  const filledEnd = Math.PI - fraction * Math.PI

  function ptOnArc(angle: number) {
    return {
      x: cx + rx * Math.cos(angle),
      y: H - ry * Math.sin(angle) * 0.6,
    }
  }

  const s = ptOnArc(startAngle)
  const e = ptOnArc(endAngle)
  const f = ptOnArc(filledEnd)

  const bgPath = `M ${s.x} ${s.y} A ${rx} ${ry * 0.6} 0 0 1 ${e.x} ${e.y}`
  const fillPath = `M ${s.x} ${s.y} A ${rx} ${ry * 0.6} 0 0 1 ${f.x} ${f.y}`

  return (
    <svg width={W} height={H + 2} viewBox={`0 0 ${W} ${H + 2}`}>
      <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={2} strokeLinecap="round" />
      <path d={fillPath} fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
    </svg>
  )
}

export function SunCalendarCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const data = qc.getQueryData<ExtendedForecastData>(['forecast-extended', location?.lat, location?.lon])

  if (!location || !data || !data.days?.length) return null

  const days = data.days.slice(0, 7)
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // Calculate daylight range for progress arc
  const daylights = days.map(d => daylightMinutes(d.sunrise, d.sunset))
  const maxDaylight = Math.max(...daylights, 1)
  const minDaylight = Math.min(...daylights)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">☀ Calendario Solar</h3>

      <div className="space-y-0.5">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_48px] gap-2 px-2 pb-1 text-[10px] text-slate-600 border-b border-white/5">
          <span>Día</span>
          <span>Amanecer</span>
          <span>Atardecer</span>
          <span>Luz del día</span>
          <span className="text-center">Arco</span>
        </div>

        {days.map((day, i) => {
          const date = new Date(day.date + 'T12:00:00')
          const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DAYS_ES[date.getDay()]
          const isToday = day.date === todayStr
          const dl = daylights[i]
          const fraction = maxDaylight > minDaylight ? (dl - minDaylight) / (maxDaylight - minDaylight) : 0.5

          return (
            <div
              key={day.date}
              className={`grid grid-cols-[60px_1fr_1fr_1fr_48px] gap-2 items-center px-2 py-1.5 rounded-xl text-xs ${isToday ? 'bg-amber-500/10 border border-amber-500/15' : 'hover:bg-white/5 transition-colors'}`}
            >
              <div>
                <div className={`font-medium ${isToday ? 'text-amber-300' : 'text-slate-300'}`}>{dayName}</div>
                <div className="text-[10px] text-slate-600">{date.getDate()} {date.toLocaleDateString('es-MX', { month: 'short' })}</div>
              </div>
              <div className="text-slate-300">
                <span className="text-yellow-400">↑</span> {fmt(day.sunrise)}
              </div>
              <div className="text-slate-300">
                <span className="text-orange-400">↓</span> {fmt(day.sunset)}
              </div>
              <div className="text-slate-400 text-[11px]">{dl > 0 ? minsToHM(dl) : '—'}</div>
              <div className="flex justify-center">
                <SunArc fraction={fraction} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-[10px] text-slate-700 text-center">
        El arco indica la duración relativa del día (↑ más luz = arco mayor)
      </div>
    </div>
  )
}
