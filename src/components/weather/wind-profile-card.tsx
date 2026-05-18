'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { WindProfileData } from '@/app/api/wind-profile/route'

function windDir(deg: number) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

function windColor(speed: number) {
  if (speed >= 60) return '#ef4444'
  if (speed >= 40) return '#f97316'
  if (speed >= 25) return '#eab308'
  if (speed >= 15) return '#4ade80'
  return '#94a3b8'
}

export function WindProfileCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<WindProfileData>({
    queryKey: ['wind-profile', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/wind-profile?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    v10: h.v10,
    v80: h.v80,
    v120: h.v120,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌬️ Perfil de Viento Vertical</h3>
        {data.tradeWinds && (
          <span className="text-xs px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">Alisios</span>
        )}
      </div>

      {/* Wind profile at 3 levels */}
      <div className="mb-4">
        {data.current.map((level, i) => {
          const c = windColor(level.speed)
          const pct = Math.min(100, level.speed / 80 * 100)
          return (
            <div key={i} className="mb-2">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-medium text-slate-400">{level.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-600">{windDir(level.direction)}</span>
                  <span className="text-xs font-bold" style={{ color: c }}>{level.speed} km/h</span>
                  <span className="text-[9px] text-slate-600">{level.power} W/m²</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Shear info */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">Cizalladura 10→80m</div>
          <div className="font-bold text-slate-300">{data.surfaceBoundary} km/h</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">Jet stream 120m</div>
          <div className="font-bold" style={{ color: data.jetStream.present ? '#f97316' : '#94a3b8' }}>
            {data.jetStream.present ? `${data.jetStream.speed} km/h` : 'No detectado'}
          </div>
        </div>
      </div>

      {/* 48h 3-level chart */}
      <div className="text-[10px] text-slate-600 mb-1">Velocidad por nivel — 48h (km/h)</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} unit=" km/h" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v} km/h`, `${name}`]}
            />
            <Line type="monotone" dataKey="v10" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="10m" />
            <Line type="monotone" dataKey="v80" stroke="#60a5fa" strokeWidth={1.5} dot={false} name="80m" />
            <Line type="monotone" dataKey="v120" stroke="#f97316" strokeWidth={1.5} dot={false} name="120m" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 7-day max at 80m/120m */}
      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {data.daily.map((d, i) => {
          const c = windColor(d.maxSpeed80m)
          return (
            <div key={i} className="text-center">
              <div className="text-[7px] text-slate-600">{d.label.slice(0, 3)}</div>
              <div className="mt-0.5 h-7 rounded flex items-center justify-center text-center" style={{
                background: c + '20', border: `1px solid ${c}33`,
              }}>
                <div>
                  <div className="text-[7px] font-bold" style={{ color: c }}>{d.maxSpeed80m}</div>
                  <div className="text-[6px] text-slate-700">{windDir(d.direction80m)}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Potencia W/m² = ½ρv³Cp · Cizalladura = V80m − V10m · Ley de potencia α=0.143
      </div>
    </div>
  )
}
