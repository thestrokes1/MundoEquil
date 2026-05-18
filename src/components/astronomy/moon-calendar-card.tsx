'use client'
import { getMoonPhaseLabel } from '@/lib/weather-codes'

function getMoonPhase(date: Date): number {
  // Simplified moon phase calculation — returns 0..1
  const knownNewMoon = new Date('2000-01-06T18:14:00Z')
  const lunarPeriod = 29.530588853 * 24 * 60 * 60 * 1000
  const elapsed = date.getTime() - knownNewMoon.getTime()
  const phase = ((elapsed % lunarPeriod) + lunarPeriod) % lunarPeriod
  return phase / lunarPeriod
}

const DAY_HEADERS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function MoonCalendarCard() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay() // 0=Sun

  const monthName = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  // Build calendar grid
  const cells: (null | Date)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const today = now.getDate()

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Calendario Lunar</h3>
      <div className="text-center text-xs text-slate-400 mb-3 capitalize">{monthName}</div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-[10px] text-slate-600 py-0.5">{d}</div>
        ))}
      </div>

      {/* Calendar rows */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />

          const phase = getMoonPhase(date)
          const { emoji } = getMoonPhaseLabel(phase)
          const isToday = date.getDate() === today
          const isNewMoon = phase < 0.04 || phase > 0.96
          const isFullMoon = phase > 0.46 && phase < 0.54

          return (
            <div
              key={date.toISOString()}
              className={`flex flex-col items-center py-1 rounded-xl transition-colors ${
                isToday ? 'bg-indigo-500/20 border border-indigo-500/30' :
                isNewMoon ? 'bg-slate-700/30' :
                isFullMoon ? 'bg-yellow-500/10' :
                'hover:bg-white/5'
              }`}
              title={getMoonPhaseLabel(phase).label}
            >
              <span className="text-sm leading-none">{emoji}</span>
              <span className={`text-[10px] mt-0.5 ${isToday ? 'text-indigo-300 font-bold' : 'text-slate-500'}`}>
                {date.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 justify-center text-[10px] text-slate-600">
        <span>🌑 Luna nueva</span>
        <span>🌕 Luna llena</span>
        <span className="text-indigo-400">Hoy</span>
      </div>

      {/* Current phase summary */}
      {(() => {
        const { label, emoji } = getMoonPhaseLabel(getMoonPhase(now))
        const illum = Math.round(Math.abs(Math.cos(getMoonPhase(now) * 2 * Math.PI)) * 100)
        return (
          <div className="mt-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-center text-slate-400">
            Hoy: {emoji} {label} · {illum}% iluminación
          </div>
        )
      })()}
    </div>
  )
}
