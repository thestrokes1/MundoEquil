'use client'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { Location } from '@/types/weather'

interface MonthlyStats {
  month: string
  tempAvgMax: number
  tempAvgMin: number
  totalPrecipitation: number
  avgWindSpeed: number
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl space-y-1">
      <div className="text-slate-400 font-medium capitalize mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name.includes('lluvia') ? `${p.value} mm` : `${p.value}°`}
        </div>
      ))}
    </div>
  )
}

interface Props {
  location: Location
}

export function MonthlyStatsCard({ location }: Props) {
  const { unit } = useLocationStore()

  const { data, isLoading } = useQuery<MonthlyStats[]>({
    queryKey: ['monthly-stats', location.lat, location.lon],
    queryFn: () => fetch(`/api/monthly-stats?lat=${location.lat}&lon=${location.lon}`).then(r => r.json()),
    staleTime: 86_400_000,
    refetchInterval: false,
  })

  const convert = (c: number) => unit === 'fahrenheit' ? Math.round(c * 9 / 5 + 32) : c

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || data.length === 0) return null

  const chartData = data.map(d => ({
    month: d.month,
    'Máx media': convert(d.tempAvgMax),
    'Mín media': convert(d.tempAvgMin),
    'Lluvia total': d.totalPrecipitation,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Estadísticas — Últimos 6 meses
        </h3>
      </div>
      <div className="flex gap-4 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Máx media</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />Mín media</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-500/40 inline-block" />Lluvia (mm)</span>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="temp" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}°`} />
            <YAxis yAxisId="rain" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={36} tickFormatter={v => `${v}mm`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="temp" dataKey="Máx media" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar yAxisId="temp" dataKey="Mín media" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar yAxisId="rain" dataKey="Lluvia total" fill="#38bdf8" opacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[10px] text-slate-500">
          <tbody>
            <tr className="border-t border-white/5">
              <td className="py-1.5 pr-3 text-slate-600 font-medium whitespace-nowrap">Viento promedio</td>
              {data.map(d => (
                <td key={d.month} className="py-1.5 text-center whitespace-nowrap">{d.avgWindSpeed} km/h</td>
              ))}
            </tr>
            <tr className="border-t border-white/5">
              <td className="py-1.5 pr-3 text-slate-600 font-medium whitespace-nowrap">Lluvia total</td>
              {data.map(d => (
                <td key={d.month} className="py-1.5 text-center whitespace-nowrap">{d.totalPrecipitation} mm</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
