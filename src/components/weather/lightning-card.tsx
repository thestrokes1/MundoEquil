'use client'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { LightningData } from '@/app/api/lightning/route'

function stormRisk(lp: number | null, cape: number | null): { label: string; color: string; desc: string } {
  const potential = lp ?? 0
  const instability = cape ?? 0
  if (potential >= 70 || instability >= 2000) return { label: 'Extremo', color: '#f87171', desc: 'Tormentas severas probables' }
  if (potential >= 40 || instability >= 800) return { label: 'Alto', color: '#fb923c', desc: 'Tormentas posibles' }
  if (potential >= 15 || instability >= 300) return { label: 'Moderado', color: '#facc15', desc: 'Actividad convectiva posible' }
  if (potential > 0) return { label: 'Bajo', color: '#4ade80', desc: 'Riesgo mínimo de rayos' }
  return { label: 'Ninguno', color: '#64748b', desc: 'Sin riesgo convectivo' }
}

function barColor(val: number): string {
  if (val >= 70) return '#f87171'
  if (val >= 40) return '#fb923c'
  if (val >= 15) return '#facc15'
  return '#4ade80'
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{time}</div>
      <div className="text-yellow-300 font-semibold">{payload[0].value}%</div>
    </div>
  )
}

export function LightningCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<LightningData>({
    queryKey: ['lightning', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/lightning?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-40 bg-white/10" />
      </div>
    )
  }

  if (!data || !data.hourly?.time?.length) return null

  const now = new Date()
  const currentIdx = data.hourly.time.reduce((best, t, i) =>
    Math.abs(new Date(t).getTime() - now.getTime()) < Math.abs(new Date(data.hourly.time[best]).getTime() - now.getTime()) ? i : best
  , 0)

  const currentLP = data.hourly.lightningPotential[currentIdx] ?? 0
  const currentCAPE = data.hourly.cape[currentIdx] ?? 0
  const currentLI = data.hourly.liftedIndex[currentIdx]
  const risk = stormRisk(currentLP, currentCAPE)

  const nextWindow = data.hourly.time.slice(currentIdx, currentIdx + 24)
  const maxLP = Math.max(...nextWindow.map((_, i) => data.hourly.lightningPotential[currentIdx + i] ?? 0))

  const chartData = data.hourly.time
    .slice(currentIdx, currentIdx + 24)
    .map((t, i) => ({
      time: t,
      lp: data.hourly.lightningPotential[currentIdx + i] ?? 0,
    }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Tormentas Eléctricas</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{ color: risk.color, borderColor: risk.color + '44', background: risk.color + '1a' }}>
          {risk.label}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <div className="text-4xl font-bold tabular-nums" style={{ color: risk.color }}>{currentLP}</div>
        <div className="text-slate-400 text-sm mb-1">% potencial · {risk.desc}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">CAPE</div>
          <div className="text-slate-200 font-semibold">{currentCAPE.toFixed(0)} J/kg</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Índice lift.</div>
          <div className="text-slate-200 font-semibold">{currentLI !== null ? `${currentLI.toFixed(1)}` : '—'}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-slate-500 mb-1">Máx 24h</div>
          <div className="font-semibold" style={{ color: barColor(maxLP) }}>{maxLP}%</div>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="lp" radius={[3, 3, 0, 0]} maxBarSize={14}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.lp)} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
