'use client'
import { useState, useEffect } from 'react'
import { Sunrise, Sunset } from 'lucide-react'
import { getMoonPhaseLabel } from '@/lib/weather-codes'
import { getMoonPhase } from '@/lib/moon'
import { formatTime, formatDuration } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { DailyForecast } from '@/types/weather'

interface Props {
  today: DailyForecast
  tomorrow?: DailyForecast
}

function Countdown({ targetISO, label }: { targetISO: string; label: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function calc() {
      const diff = new Date(targetISO).getTime() - Date.now()
      if (diff <= 0) { setRemaining('--'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetISO])

  return (
    <div className="text-right">
      <div className="text-[10px] text-slate-500 uppercase mb-0.5">{label}</div>
      <span className="font-mono text-sky-300 text-sm tabular-nums">{remaining}</span>
    </div>
  )
}

export function AstronomyCard({ today, tomorrow }: Props) {
  const moonPhase = getMoonPhaseLabel(getMoonPhase())
  const sunriseISO = today.sunrise
  const sunsetISO = today.sunset

  const daylightSeconds =
    (new Date(sunsetISO).getTime() - new Date(sunriseISO).getTime()) / 1000

  const now = Date.now()
  const sunsetMs = new Date(sunsetISO).getTime()
  const sunriseMs = new Date(sunriseISO).getTime()

  let nextEventISO: string
  let nextEventLabel: string

  if (now < sunriseMs) {
    nextEventISO = sunriseISO
    nextEventLabel = 'Amanecer en'
  } else if (now < sunsetMs) {
    nextEventISO = sunsetISO
    nextEventLabel = 'Atardecer en'
  } else if (tomorrow) {
    nextEventISO = tomorrow.sunrise
    nextEventLabel = 'Amanecer mañana en'
  } else {
    nextEventISO = sunriseISO
    nextEventLabel = 'Amanecer'
  }

  const start = sunriseMs
  const end = sunsetMs
  const sunPct = Math.max(0, Math.min(((now - start) / (end - start)) * 100, 100))

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/30 to-purple-900/20 backdrop-blur-md p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Astronomía</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 bg-amber-500/10 rounded-2xl p-3">
          <Sunrise className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Amanecer</div>
            <div className="text-base font-bold text-slate-100">{formatTime(sunriseISO)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-orange-500/10 rounded-2xl p-3">
          <Sunset className="w-6 h-6 text-orange-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Atardecer</div>
            <div className="text-base font-bold text-slate-100">{formatTime(sunsetISO)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Luz solar: {formatDuration(daylightSeconds)}</span>
          <span>{formatTime(sunriseISO)} – {formatTime(sunsetISO)}</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
          <div
            className="absolute h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-1000"
            style={{ width: `${sunPct}%` }}
          />
          {sunPct > 2 && sunPct < 98 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-300 rounded-full shadow-lg shadow-yellow-400/50"
              style={{ left: `calc(${sunPct}% - 6px)` }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{moonPhase.emoji}</span>
          <div>
            <div className="text-xs text-slate-400">Fase lunar</div>
            <div className="text-sm font-medium text-slate-200">{moonPhase.label}</div>
          </div>
        </div>
        <Countdown targetISO={nextEventISO} label={nextEventLabel} />
      </div>
    </div>
  )
}

export function AstronomySkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
      <Skeleton className="h-4 w-28 bg-white/10" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-2xl bg-white/10" />
        <Skeleton className="h-16 rounded-2xl bg-white/10" />
      </div>
      <Skeleton className="h-4 bg-white/10" />
      <Skeleton className="h-8 bg-white/10" />
    </div>
  )
}
