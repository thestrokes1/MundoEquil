'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import type { SolarYieldData } from '@/app/api/solar-yield/route'

function yieldColor(kwh: number) {
  if (kwh >= 5) return '#fbbf24'
  if (kwh >= 4) return '#fb923c'
  if (kwh >= 3) return '#4ade80'
  if (kwh >= 2) return '#38bdf8'
  return '#64748b'
}

export function SolarYieldCard() {
  const location = useLocationStore(s => s.location)
  const [panelKwp, setPanelKwp] = useState(3)  // kWp default

  const { data, isLoading } = useQuery<SolarYieldData>({
    queryKey: ['solar-yield', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/solar-yield?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const todayYield = (data.days[0]?.estimatedYield ?? 0) * panelKwp
  const weekYield = data.days.reduce((s, d) => s + d.estimatedYield, 0) * panelKwp
  const avgYield = data.avgYield7d * panelKwp

  const chartData = data.days.map(d => ({
    day: new Date(d.date).toLocaleDateString('es-MX', { weekday: 'short' }),
    yield: parseFloat((d.estimatedYield * panelKwp).toFixed(1)),
    ghi: d.ghi,
  }))

  const bestDayStr = data.bestDay
    ? new Date(data.bestDay).toLocaleDateString('es-MX', { weekday: 'long' })
    : '—'

  // CO₂ equivalent avoided (0.233 kg CO₂/kWh average grid)
  const co2Avoided = parseFloat((weekYield * 0.233).toFixed(1))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">⚡ Producción Solar Fotovoltaica</h3>

      {/* Panel size selector */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs text-slate-400">Tamaño del sistema:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 5, 8, 10].map(kw => (
            <button
              key={kw}
              onClick={() => setPanelKwp(kw)}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                background: panelKwp === kw ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                color: panelKwp === kw ? '#1e293b' : '#94a3b8',
              }}
            >
              {kw} kWp
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-amber-400 mb-1">Hoy</div>
          <div className="text-2xl font-bold text-amber-300">{todayYield.toFixed(1)}</div>
          <div className="text-[10px] text-amber-400/60">kWh</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Esta semana</div>
          <div className="text-2xl font-bold text-slate-200">{weekYield.toFixed(0)}</div>
          <div className="text-[10px] text-slate-600">kWh</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Promedio/día</div>
          <div className="text-2xl font-bold text-slate-200">{avgYield.toFixed(1)}</div>
          <div className="text-[10px] text-slate-600">kWh/día</div>
        </div>
      </div>

      {/* CO2 badge */}
      <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs flex items-center justify-between">
        <span className="text-green-300">🌱 CO₂ evitado esta semana</span>
        <span className="font-bold text-green-300">{co2Avoided} kg</span>
      </div>

      {/* 7-day yield chart */}
      <div className="text-[10px] text-slate-600 mb-1">Producción diaria estimada (kWh)</div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v} kWh`, 'Producción']}
            />
            <ReferenceLine y={avgYield} stroke="#fbbf2480" strokeDasharray="4 4" />
            <Bar dataKey="yield" radius={[3, 3, 0, 0]} maxBarSize={32}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={yieldColor(d.yield / panelKwp)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Metadata */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="bg-white/5 rounded-xl px-2.5 py-2">
          <div className="text-slate-600">Mejor día</div>
          <div className="text-slate-300 font-medium capitalize">{bestDayStr}</div>
        </div>
        <div className="bg-white/5 rounded-xl px-2.5 py-2">
          <div className="text-slate-600">Horas pico de sol (PSH)</div>
          <div className="text-slate-300 font-medium">{data.peakSunHours} h/día</div>
        </div>
        <div className="bg-white/5 rounded-xl px-2.5 py-2">
          <div className="text-slate-600">Factor de rendimiento (PR)</div>
          <div className="text-slate-300 font-medium">{(data.performanceRatio * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-white/5 rounded-xl px-2.5 py-2">
          <div className="text-slate-600">GHI semana</div>
          <div className="text-slate-300 font-medium">{data.totalGHI7d} kWh/m²</div>
        </div>
      </div>

      <div className="mt-3 text-[9px] text-slate-700 text-center">
        Estimación basada en GHI de Open-Meteo · PR=0.80 · Derating térmico real
      </div>
    </div>
  )
}
