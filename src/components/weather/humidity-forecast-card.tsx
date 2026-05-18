'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Droplets } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { HumidityForecastData } from '@/app/api/humidity-forecast/route'

export function HumidityForecastCard() {
  const location = useLocationStore((s) => s.location)
  const { data, isLoading } = useQuery<HumidityForecastData>({
    queryKey: ['humidity-forecast', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/humidity-forecast?lat=${location!.lat}&lon=${location!.lon}`)
        .then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: 3_600_000,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-16 bg-white/10 rounded-2xl" />
        <Skeleton className="h-28 bg-white/10 rounded-2xl" />
      </div>
    )
  }
  if (!data || 'error' in data || !data.days?.length) return null

  const chartData = data.hours.filter((_, i) => i % 2 === 0)

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-900/20 to-slate-900/40 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <Droplets className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Humedad detallada</h3>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Comfort badge */}
        <div className="flex items-center gap-3">
          <div
            className="text-3xl font-black"
            style={{ color: data.comfortColor }}
          >
            {data.currentHumidity}%
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: data.comfortColor }}>{data.comfortLabel}</p>
            <p className="text-xs text-slate-400">Punto de rocío: {data.dewPoint}°C</p>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Humedad absoluta', value: `${data.absoluteHumidity} g/m³` },
            { label: 'Presión vapor',    value: `${data.vaporPressure} hPa` },
            { label: 'Sat. vapor',       value: `${data.saturationVP} hPa` },
            { label: 'H. relativa vap.', value: `${data.relativeVP}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-xl px-3 py-1.5">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="text-xs font-bold text-slate-200">{value}</p>
            </div>
          ))}
        </div>

        {/* Mold risk */}
        {data.mold48h && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <span className="text-base">🦠</span>
            <p className="text-xs text-amber-300">{data.moldRisk}</p>
          </div>
        )}

        {/* 48h humidity chart */}
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="rhGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 100]} />
            <ReferenceLine y={80} stroke="#fbbf24" strokeDasharray="3 3" strokeWidth={1} label={{ value: '80%', fill: '#fbbf24', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={30} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
              formatter={(v: unknown, n: unknown) => [
                `${v}${n === 'dewPoint' ? '°C' : n === 'absoluteHumidity' ? ' g/m³' : '%'}`,
                n === 'rh' ? 'HR' : n === 'dewPoint' ? 'Rocío' : 'AH',
              ]}
            />
            <Area type="monotone" dataKey="rh" stroke="#22d3ee" strokeWidth={2} fill="url(#rhGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        {/* 7-day mold risk table */}
        <div className="grid grid-cols-7 gap-1">
          {data.days.map(d => (
            <div key={d.label} className="text-center">
              <p className="text-[9px] text-slate-500 truncate">{d.label.split(' ')[0]}</p>
              <div className={`w-5 h-5 rounded-full mx-auto mt-1 flex items-center justify-center ${d.mold ? 'bg-amber-500/30' : 'bg-white/10'}`}>
                <span className="text-[9px]">{d.mold ? '🦠' : '✓'}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">{d.maxRH}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
