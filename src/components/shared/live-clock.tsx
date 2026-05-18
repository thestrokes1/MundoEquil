'use client'
import { useLiveClock } from '@/hooks/use-live-clock'

export function LiveClock() {
  const now = useLiveClock()
  if (!now) return <span className="text-slate-500 text-sm">--:--:--</span>

  const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="text-right">
      <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums leading-none">{time}</div>
      <div className="text-xs text-slate-400 capitalize mt-0.5">{date}</div>
    </div>
  )
}
