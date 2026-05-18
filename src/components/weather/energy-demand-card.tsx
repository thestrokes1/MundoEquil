'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import type { EnergyDemandData } from '@/app/api/energy-demand/route'

const SEASON_CONFIG = {
  heating: { label: 'Temporada de calefacción', color: '#60a5fa', icon: '🔥' },
  cooling: { label: 'Temporada de refrigeración', color: '#f87171', icon: '❄️' },
  neutral: { label: 'Temporada neutra', color: '#94a3b8', icon: '🌡️' },
}

export function EnergyDemandCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<EnergyDemandData>({
    queryKey: ['energy-demand', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/energy-demand?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const season = SEASON_CONFIG[data.season]
  const chartData = data.days.map(d => ({
    label: d.label,
    hdd: d.hdd,
    cdd: d.cdd,
    avg: d.tempAvg,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">⚡ Demanda Energética</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: season.color, borderColor: season.color + '44', background: season.color + '1a',
        }}>
          {season.icon} {data.season === 'neutral' ? 'Neutral' : data.season === 'heating' ? 'Calefacción' : 'Refrigeración'}
        </span>
      </div>

      {/* Today's degree days */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-500 mb-1">🔥 HDD hoy (calefacción)</div>
          <div className="text-2xl font-bold text-blue-400">{data.today?.hdd.toFixed(1)}</div>
          <div className="text-[9px] text-slate-600">acum. 30d: {data.monthlyHDD}</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-500 mb-1">❄️ CDD hoy (refrigeración)</div>
          <div className="text-2xl font-bold text-red-400">{data.today?.cdd.toFixed(1)}</div>
          <div className="text-[9px] text-slate-600">acum. 30d: {data.monthlyCDD}</div>
        </div>
      </div>

      {/* 7-day chart */}
      <div className="text-[10px] text-slate-600 mb-1">Grados-día 7 días — HDD (azul) / CDD (rojo)</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fontSize: 7, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [
                `${(v as number).toFixed(1)}°`,
                name === 'hdd' ? 'HDD' : name === 'cdd' ? 'CDD' : 'T media',
              ]}
            />
            <Bar dataKey="hdd" fill="#60a5fa" fillOpacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={18} />
            <Bar dataKey="cdd" fill="#f87171" fillOpacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={18} />
            <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Peak days */}
      <div className="mt-3 flex gap-2 text-xs">
        {data.peakHeatingDay && data.peakHeatingDay.hdd > 0 && (
          <div className="flex-1 bg-blue-500/10 rounded-xl p-2 text-center">
            <div className="text-[8px] text-slate-600">Más frío</div>
            <div className="font-semibold text-blue-400">{data.peakHeatingDay.label}</div>
            <div className="text-[8px] text-slate-500">{data.peakHeatingDay.hdd.toFixed(1)} HDD</div>
          </div>
        )}
        {data.peakCoolingDay && data.peakCoolingDay.cdd > 0 && (
          <div className="flex-1 bg-red-500/10 rounded-xl p-2 text-center">
            <div className="text-[8px] text-slate-600">Más caliente</div>
            <div className="font-semibold text-red-400">{data.peakCoolingDay.label}</div>
            <div className="text-[8px] text-slate-500">{data.peakCoolingDay.cdd.toFixed(1)} CDD</div>
          </div>
        )}
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Base 18°C · HDD = días-grado calefacción · CDD = días-grado refrigeración
      </div>
    </div>
  )
}
