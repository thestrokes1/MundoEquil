'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { PWATData } from '@/app/api/pwat/route'

const CAT_CONFIG: Record<PWATData['category'], { label: string; color: string }> = {
  dry:        { label: 'Seco',           color: '#94a3b8' },
  normal:     { label: 'Normal',         color: '#4ade80' },
  moist:      { label: 'Húmedo',         color: '#38bdf8' },
  very_moist: { label: 'Muy húmedo',     color: '#f97316' },
  extreme:    { label: 'Extremo',        color: '#ef4444' },
}

const RAIN_CONFIG: Record<PWATData['rainfall_potential'], { label: string; color: string }> = {
  low:      { label: 'Bajo',     color: '#4ade80' },
  moderate: { label: 'Moderado', color: '#eab308' },
  high:     { label: 'Alto',     color: '#f97316' },
  extreme:  { label: 'Extremo', color: '#ef4444' },
}

function pwatColor(v: number) {
  if (v >= 60) return '#ef4444'
  if (v >= 45) return '#f97316'
  if (v >= 30) return '#38bdf8'
  if (v >= 15) return '#4ade80'
  return '#94a3b8'
}

export function PWATCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<PWATData>({
    queryKey: ['pwat', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/pwat?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const cat = CAT_CONFIG[data.category]
  const rain = RAIN_CONFIG[data.rainfall_potential]
  const color = pwatColor(data.currentPWAT)

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    pwat: h.pwat,
    rh: h.humidity,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌧️ Agua Precipitable (PWAT)</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a',
        }}>
          {cat.label}
        </span>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">PWAT actual</div>
          <div className="text-3xl font-bold" style={{ color }}>{data.currentPWAT}</div>
          <div className="text-[9px] text-slate-500">mm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Máx 24h</div>
          <div className="text-xl font-bold" style={{ color: pwatColor(data.maxPWAT24h) }}>{data.maxPWAT24h}</div>
          <div className="text-[9px] text-slate-500">mm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Pot. lluvia</div>
          <div className="text-sm font-bold" style={{ color: rain.color }}>{rain.label}</div>
        </div>
      </div>

      {/* Scale bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[8px] text-slate-700 mb-0.5">
          <span>0 — Seco</span><span>15 — Normal</span><span>30 — Húmedo</span><span>50+ — Extremo</span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden" style={{
          background: 'linear-gradient(to right, #94a3b8, #4ade80, #38bdf8, #f97316, #ef4444)',
        }}>
          <div className="absolute top-0 h-full w-0.5 bg-white rounded-full" style={{
            left: `${Math.min(98, data.currentPWAT / 60 * 100)}%`,
          }} />
        </div>
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Agua precipitable columnar — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="pwatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} unit="mm" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}${name === 'pwat' ? ' mm' : '%'}`, name === 'pwat' ? 'PWAT' : 'HR']}
            />
            <ReferenceLine y={30} stroke="#38bdf8" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={45} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Area type="monotone" dataKey="pwat" stroke={color} fill="url(#pwatGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 7-day daily */}
      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {data.daily.slice(0, 7).map((d, i) => {
          const c = pwatColor(d.avgPWAT)
          return (
            <div key={i} className="text-center">
              <div className="text-[7px] text-slate-600">{d.label.slice(0, 3)}</div>
              <div className="mt-0.5 h-8 rounded flex flex-col items-center justify-center" style={{
                background: c + '20', border: `1px solid ${c}33`,
              }}>
                <span className="text-[8px] font-bold" style={{ color: c }}>{d.avgPWAT}</span>
                <span className="text-[6px] text-slate-700">mm</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Estimación columnar desde superficie · Clausius-Clapeyron + punto de rocío
      </div>
    </div>
  )
}
