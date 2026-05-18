'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Snowflake } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { ColdWaveData } from '@/app/api/cold-wave/route'

export function ColdWaveCard() {
  const location = useLocationStore((s) => s.location)
  const { data, isLoading } = useQuery<ColdWaveData>({
    queryKey: ['cold-wave', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/cold-wave?lat=${location!.lat}&lon=${location!.lon}`)
        .then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-36 bg-white/10" />
        <Skeleton className="h-16 bg-white/10 rounded-2xl" />
        <Skeleton className="h-28 bg-white/10 rounded-2xl" />
      </div>
    )
  }
  if (!data || 'error' in data) return null

  const chartData = data.forecast.map(d => ({
    label: d.label,
    min: d.minTemp,
    max: d.maxTemp,
    wc: d.windChill,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/40 to-sky-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <Snowflake className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Ola de frío</h3>
        {data.isActiveColdWave && (
          <span
            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: data.severityColor, backgroundColor: data.severityColor + '22' }}
          >
            {data.severityLabel}
          </span>
        )}
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Tmin hoy',    value: `${data.minTempToday}°`,  color: data.severityColor },
            { label: 'Sensación',   value: `${data.windChill}°`,     color: '#94a3b8' },
            { label: 'Anomalía',    value: `${data.minTempAnomaly > 0 ? '+' : ''}${data.minTempAnomaly}°`, color: data.minTempAnomaly < -5 ? '#3b82f6' : '#94a3b8' },
            { label: 'Días frío',   value: `${data.coldWaveDays}d`,  color: '#94a3b8' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 rounded-xl p-2 text-center">
              <p className="text-[9px] text-slate-500 uppercase">{label}</p>
              <p className="text-sm font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Risk icons */}
        <div className="flex gap-2 flex-wrap">
          {[
            { flag: data.frostRisk,  label: '❄️ Helada',     desc: 'Riesgo de helada' },
            { flag: data.pipeRisk,   label: '🚿 Tuberías',   desc: 'Congelamiento de tuberías' },
            { flag: data.snowRisk,   label: '🌨️ Nieve',      desc: 'Posible nieve' },
          ].map(({ flag, label, desc }) => (
            <span
              key={label}
              className={`text-[11px] px-2 py-1 rounded-lg ${flag ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-500'}`}
              title={desc}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Advice */}
        <div className="space-y-1">
          {data.advice.map(a => (
            <p key={a} className="text-xs text-slate-400 flex items-start gap-1.5">
              <span className="text-sky-500 mt-0.5">•</span>{a}
            </p>
          ))}
        </div>

        {/* 7-day chart */}
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -25 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 8, fill: '#64748b' }} domain={['auto', 'auto']} />
            <ReferenceLine y={0} stroke="#60a5fa" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
              formatter={(v: unknown, n: unknown) => [`${v}°C`, n === 'min' ? 'T mín' : n === 'max' ? 'T máx' : 'Sensación']}
            />
            <Line type="monotone" dataKey="max" stroke="#f97316" strokeWidth={1.5} dot={false} name="max" />
            <Line type="monotone" dataKey="min" stroke="#3b82f6" strokeWidth={2} dot={false} name="min" />
            <Line type="monotone" dataKey="wc" stroke="#93c5fd" strokeWidth={1} strokeDasharray="4 2" dot={false} name="wc" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
