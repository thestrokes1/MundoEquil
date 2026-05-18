'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import type { ETData } from '@/app/api/evapotranspiration/route'

function etColor(et: number) {
  if (et >= 7) return '#ef4444'
  if (et >= 5) return '#f97316'
  if (et >= 3) return '#eab308'
  if (et >= 1) return '#4ade80'
  return '#94a3b8'
}

export function EvapotranspirationCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ETData>({
    queryKey: ['evapotranspiration', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/evapotranspiration?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || !data.today) return null

  const todayC = etColor(data.today.et0)
  const chartData = data.days.map(d => ({
    label: d.label.slice(0, 5),
    et0: d.et0,
    precip: d.precip,
    net: d.netWater,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌱 Evapotranspiración (FAO-56)</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: todayC, borderColor: todayC + '44', background: todayC + '1a',
        }}>
          ET₀ {data.today.et0} mm/d
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">ET₀ hoy</div>
          <div className="text-2xl font-bold" style={{ color: todayC }}>{data.today.et0}</div>
          <div className="text-[9px] text-slate-600">mm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">ET₀ 30d</div>
          <div className="text-xl font-bold text-slate-300">{data.monthlyET0}</div>
          <div className="text-[9px] text-slate-600">mm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Balance 30d</div>
          <div className="text-xl font-bold" style={{ color: data.waterBalance >= 0 ? '#4ade80' : '#f87171' }}>
            {data.waterBalance > 0 ? '+' : ''}{data.waterBalance}
          </div>
          <div className="text-[9px] text-slate-600">mm</div>
        </div>
      </div>

      {/* Crop water needs */}
      <div className="text-[10px] text-slate-600 mb-1.5">Necesidades hídricas por cultivo (ETC = Kc × ET₀ hoy)</div>
      <div className="space-y-1.5 mb-4">
        {data.cropFactors.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm">{c.emoji}</span>
            <span className="text-[10px] text-slate-400 w-28 flex-shrink-0">{c.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${Math.min(100, c.etc / 10 * 100)}%`,
                background: c.waterStress ? '#ef4444' : '#4ade80',
              }} />
            </div>
            <span className="text-[10px] font-bold text-slate-300 w-12 text-right">{c.etc} mm</span>
            {c.waterStress && <span className="text-[8px] text-red-400">⚠️</span>}
          </div>
        ))}
      </div>

      {/* 7-day ET0 vs Precip chart */}
      <div className="text-[10px] text-slate-600 mb-1">ET₀ vs precipitación 7 días (mm)</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fontSize: 7, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [
                `${v} mm`,
                name === 'et0' ? 'ET₀' : name === 'precip' ? 'Precip' : 'Balance',
              ]}
            />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={0.5} />
            <Bar dataKey="et0" fill="#f97316" fillOpacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={16} />
            <Bar dataKey="precip" fill="#38bdf8" fillOpacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={16} />
            <Line type="monotone" dataKey="net" stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Método Penman-Monteith FAO-56 · ETC = Kc × ET₀ · Verde = balance neto P−ET₀
      </div>
    </div>
  )
}
