'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Thermometer } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { UTCIData } from '@/app/api/utci/route'

const STRESS_LEVELS = [
  { min: -40, max: -27, label: 'Frío extremo',       color: '#1e3a8a' },
  { min: -27, max: -13, label: 'Frío muy fuerte',    color: '#1d4ed8' },
  { min: -13, max:   0, label: 'Frío fuerte',        color: '#3b82f6' },
  { min:   0, max:   9, label: 'Frío moderado',      color: '#60a5fa' },
  { min:   9, max:  26, label: 'Sin estrés',         color: '#22c55e' },
  { min:  26, max:  32, label: 'Calor moderado',     color: '#fbbf24' },
  { min:  32, max:  38, label: 'Calor fuerte',       color: '#f97316' },
  { min:  38, max:  46, label: 'Calor muy fuerte',   color: '#ef4444' },
  { min:  46, max: 100, label: 'Calor extremo',      color: '#7f1d1d' },
]

export function UTCICard() {
  const location = useLocationStore((s) => s.location)
  const { data, isLoading } = useQuery<UTCIData>({
    queryKey: ['utci', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/utci?lat=${location!.lat}&lon=${location!.lon}`)
        .then(r => r.json()),
    enabled: !!location,
    staleTime: 1_800_000,
    refetchInterval: 1_800_000,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="h-20 bg-white/10 rounded-2xl" />
        <Skeleton className="h-32 bg-white/10 rounded-2xl" />
      </div>
    )
  }
  if (!data || 'error' in data || !data.hours?.length) return null

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    utci: h.utci,
    fill: data.categoryColor,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-900/20 to-pink-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <Thermometer className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Índice UTCI</h3>
        <span className="ml-auto text-[10px] text-slate-500">Clima térmico universal</span>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Big value */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-lg"
            style={{ backgroundColor: data.categoryColor + '33', border: `2px solid ${data.categoryColor}55` }}
          >
            <span className="text-xl font-black" style={{ color: data.categoryColor }}>{data.utci}°</span>
            <span className="text-[9px] text-slate-400">UTCI</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-100">{data.categoryLabel}</p>
            <p className="text-xs text-slate-400 mt-0.5">{data.advice}</p>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    backgroundColor: i < data.stressLevel
                      ? (data.stressLevel >= 6 ? '#ef4444' : data.stressLevel >= 4 ? '#fbbf24' : '#3b82f6')
                      : '#ffffff15',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scale */}
        <div className="flex rounded-xl overflow-hidden h-2">
          {STRESS_LEVELS.map(s => (
            <div key={s.label} className="flex-1" style={{ backgroundColor: s.color }} title={`${s.label}: ${s.min}–${s.max}°`} />
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -25 }}>
            <defs>
              <linearGradient id="utciGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={data.categoryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={data.categoryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 8, fill: '#64748b' }} domain={['auto', 'auto']} />
            <ReferenceLine y={26} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={9} stroke="#60a5fa" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
              formatter={(v: unknown) => [`${v}°C`, 'UTCI']}
            />
            <Area
              type="monotone"
              dataKey="utci"
              stroke={data.categoryColor}
              strokeWidth={2}
              fill="url(#utciGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
