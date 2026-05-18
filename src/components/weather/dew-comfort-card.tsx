'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { DewComfortData } from '@/app/api/dew-comfort/route'

const COMFORT_CONFIG: Record<DewComfortData['comfortLevel'], { label: string; color: string; bg: string }> = {
  pleasant:     { label: 'Agradable',         color: '#38bdf8', bg: '#0ea5e920' },
  comfortable:  { label: 'Confortable',        color: '#4ade80', bg: '#22c55e20' },
  sticky:       { label: 'Pegajoso',           color: '#a3e635', bg: '#84cc1620' },
  uncomfortable:{ label: 'Incómodo',           color: '#eab308', bg: '#eab30820' },
  oppressive:   { label: 'Sofocante',          color: '#f97316', bg: '#f9731620' },
  severe:       { label: 'Extremo / Peligroso',color: '#ef4444', bg: '#ef444420' },
}

function dewColor(dp: number) {
  if (dp >= 26) return '#ef4444'
  if (dp >= 24) return '#f97316'
  if (dp >= 21) return '#eab308'
  if (dp >= 18) return '#a3e635'
  if (dp >= 13) return '#4ade80'
  return '#38bdf8'
}

export function DewComfortCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<DewComfortData>({
    queryKey: ['dew-comfort', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/dew-comfort?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const conf = COMFORT_CONFIG[data.comfortLevel]
  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    dp: h.dewPoint,
    temp: h.temp,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">💧 Confort — Punto de Rocío</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: conf.color, borderColor: conf.color + '44', background: conf.color + '1a',
        }}>
          {conf.label}
        </span>
      </div>

      {/* Current dew point + score */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className="text-4xl font-bold" style={{ color: dewColor(data.currentDewPoint) }}>
            {data.currentDewPoint}°
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">Punto de rocío</div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[9px] text-slate-500 mb-1">
            <span>Confort</span>
            <span className="font-bold" style={{ color: conf.color }}>{data.comfortScore}/100</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{
              width: `${data.comfortScore}%`,
              background: `linear-gradient(to right, ${conf.color}80, ${conf.color})`,
            }} />
          </div>
          <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
            <span>Peligroso</span><span>Agradable</span>
          </div>
        </div>
      </div>

      {/* Muggy peak */}
      {data.mugginessPeak && data.mugginessPeak.dewPoint >= 21 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-yellow-500/20 bg-yellow-500/10 text-yellow-300">
          💦 Pico de humedad absoluta a las {data.mugginessPeak.hour} — {data.mugginessPeak.dewPoint}°C rocío
        </div>
      )}

      {/* 48h dew point chart */}
      <div className="text-[10px] text-slate-600 mb-1">Punto de rocío 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} unit="°" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}°C`, name === 'dp' ? 'Rocío' : 'Temp']}
            />
            <ReferenceLine y={21} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: 'Incómodo', position: 'right', fontSize: 7, fill: '#f97316' }} />
            <ReferenceLine y={15} stroke="#4ade80" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line type="monotone" dataKey="dp" stroke={conf.color} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="temp" stroke="#475569" strokeWidth={1} dot={false} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 7-day dew scale */}
      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {data.daily.map((d, i) => {
          const c = dewColor(d.maxDewPoint)
          return (
            <div key={i} className="text-center">
              <div className="text-[7px] text-slate-600 capitalize">{d.label.slice(0, 3)}</div>
              <div className="mt-0.5 h-8 rounded flex items-center justify-center" style={{
                background: c + '20', border: `1px solid ${c}33`,
              }}>
                <span className="text-[8px] font-bold" style={{ color: c }}>{d.maxDewPoint}°</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        &lt;13° Fresco · 13–18° Confort · 18–21° Pegajoso · 21–24° Incómodo · &gt;24° Sofocante
      </div>
    </div>
  )
}
