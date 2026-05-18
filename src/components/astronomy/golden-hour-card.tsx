'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { ExtendedForecastData } from '@/app/api/forecast-extended/route'

function fmt(iso: string | null, offsetMin = 0): string {
  if (!iso) return '—'
  const d = new Date(new Date(iso).getTime() + offsetMin * 60000)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function minutesSinceMidnight(iso: string | null): number {
  if (!iso) return -1
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

interface TimeBlock {
  label: string
  emoji: string
  start: string
  end: string
  color: string
  desc: string
  active: boolean
}

function buildBlocks(sunrise: string | null, sunset: string | null): TimeBlock[] {
  const now = nowMinutes()

  const inRange = (s: number, e: number) => now >= s && now <= e

  const srMin = minutesSinceMidnight(sunrise)
  const ssMin = minutesSinceMidnight(sunset)

  return [
    {
      label: 'Hora azul (mañana)',
      emoji: '💙',
      start: fmt(sunrise, -30),
      end: fmt(sunrise),
      color: '#818cf8',
      desc: 'Luz suave azulada antes del amanecer',
      active: srMin > 0 && inRange(srMin - 30, srMin),
    },
    {
      label: 'Hora dorada (mañana)',
      emoji: '🌅',
      start: fmt(sunrise),
      end: fmt(sunrise, 60),
      color: '#fbbf24',
      desc: 'Luz cálida y alargada después del amanecer',
      active: srMin > 0 && inRange(srMin, srMin + 60),
    },
    {
      label: 'Hora dorada (tarde)',
      emoji: '🌇',
      start: fmt(sunset, -60),
      end: fmt(sunset),
      color: '#fb923c',
      desc: 'La mejor luz del día para fotografía',
      active: ssMin > 0 && inRange(ssMin - 60, ssMin),
    },
    {
      label: 'Hora azul (tarde)',
      emoji: '🌆',
      start: fmt(sunset),
      end: fmt(sunset, 30),
      color: '#6366f1',
      desc: 'Twilight azul mágico tras el ocaso',
      active: ssMin > 0 && inRange(ssMin, ssMin + 30),
    },
  ]
}

export function GoldenHourCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const extForecast = qc.getQueryData<ExtendedForecastData>(['forecast-extended', location?.lat, location?.lon])

  if (!location) return null

  const today = extForecast?.days?.[0]
  const tomorrow = extForecast?.days?.[1]

  if (!today) return null

  const todayBlocks = buildBlocks(today.sunrise, today.sunset)
  const tomorrowBlocks = tomorrow ? buildBlocks(tomorrow.sunrise, tomorrow.sunset) : []

  const anyActive = todayBlocks.some(b => b.active)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">📸 Hora Dorada / Azul</h3>

      {anyActive && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          ✨ {todayBlocks.find(b => b.active)?.label} activa ahora
        </div>
      )}

      {/* Today's blocks */}
      <div className="mb-4">
        <div className="text-[10px] text-slate-600 mb-2">HOY</div>
        <div className="space-y-1.5">
          {todayBlocks.map(block => (
            <div
              key={block.label}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${
                block.active ? 'border' : 'bg-white/5'
              }`}
              style={block.active ? { borderColor: block.color + '44', background: block.color + '15' } : {}}
            >
              <span className="text-base shrink-0">{block.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${block.active ? '' : 'text-slate-400'}`} style={block.active ? { color: block.color } : {}}>
                  {block.label}
                </div>
                <div className="text-[10px] text-slate-600">{block.desc}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-slate-300">{block.start}</div>
                <div className="font-mono text-slate-500">–{block.end}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tomorrow summary */}
      {tomorrowBlocks.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-600 mb-2">MAÑANA</div>
          <div className="grid grid-cols-2 gap-1.5">
            {tomorrowBlocks.map(block => (
              <div key={block.label} className="bg-white/5 rounded-xl px-2.5 py-2 text-xs">
                <span className="mr-1">{block.emoji}</span>
                <span className="text-slate-500 text-[10px]">{block.start}–{block.end}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] text-slate-700 text-center">
        Basado en amanecer/atardecer de {location.name} — ideal para fotografía exterior
      </div>
    </div>
  )
}
