'use client'
import { useState, useEffect } from 'react'

const ZONES = [
  { label: 'Ciudad de México', tz: 'America/Mexico_City', flag: '🇲🇽' },
  { label: 'Nueva York', tz: 'America/New_York', flag: '🇺🇸' },
  { label: 'Londres', tz: 'Europe/London', flag: '🇬🇧' },
  { label: 'París', tz: 'Europe/Paris', flag: '🇫🇷' },
  { label: 'Tokio', tz: 'Asia/Tokyo', flag: '🇯🇵' },
  { label: 'Sídney', tz: 'Australia/Sydney', flag: '🇦🇺' },
  { label: 'Dubai', tz: 'Asia/Dubai', flag: '🇦🇪' },
  { label: 'São Paulo', tz: 'America/Sao_Paulo', flag: '🇧🇷' },
]

function getTime(tz: string): string {
  return new Date().toLocaleTimeString('es-MX', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function isDay(tz: string): boolean {
  const h = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }))
  return h >= 6 && h < 20
}

export function WorldClock() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Reloj Mundial</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ZONES.map(z => {
          const time = getTime(z.tz)
          const day = isDay(z.tz)
          return (
            <div key={z.tz} className="bg-white/5 rounded-2xl p-3 text-center">
              <div className="text-lg mb-0.5">{z.flag}</div>
              <div className="text-[10px] text-slate-500 mb-1 truncate">{z.label}</div>
              <div className={`font-mono text-sm font-bold tabular-nums ${day ? 'text-amber-300' : 'text-indigo-300'}`}>
                {tick >= 0 ? time : '—'}
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5">{day ? '☀ día' : '🌙 noche'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
