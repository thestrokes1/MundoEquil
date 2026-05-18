'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AbsoluteHumidityData } from '@/app/api/absolute-humidity/route'

function ahColor(ah: number) {
  if (ah >= 25) return '#ef4444'
  if (ah >= 20) return '#f97316'
  if (ah >= 15) return '#eab308'
  if (ah >= 10) return '#4ade80'
  return '#38bdf8'
}

export function AbsoluteHumidityCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<AbsoluteHumidityData>({
    queryKey: ['absolute-humidity', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/absolute-humidity?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const c = data.current
  const ahC = ahColor(c.absHumidity)
  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    ah: h.absHumidity,
    mr: h.mixingRatio,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">💧 Humedad Absoluta</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: ahC, borderColor: ahC + '44', background: ahC + '1a',
        }}>
          {c.absHumidity} g/m³
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-[9px] text-slate-600 mb-1">Humedad absoluta</div>
          <div className="text-2xl font-bold" style={{ color: ahC }}>{c.absHumidity}</div>
          <div className="text-[9px] text-slate-500">g/m³</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="text-[9px] text-slate-600 mb-1">Razón de mezcla</div>
          <div className="text-2xl font-bold text-sky-400">{c.mixingRatio}</div>
          <div className="text-[9px] text-slate-500">g/kg</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">P.vapor actual</div>
          <div className="font-bold text-slate-300">{c.vaporPressure} hPa</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">P.vapor sat.</div>
          <div className="font-bold text-slate-300">{c.satVaporPressure} hPa</div>
        </div>
      </div>

      {/* Condensation alert */}
      <div className={`mb-3 px-3 py-2 rounded-xl text-xs border ${data.condensationRisk ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
        {data.condensationRisk ? '💦' : '✓'} {data.condensationNote}
      </div>

      {/* 48h chart */}
      <div className="text-[10px] text-slate-600 mb-1">Humedad absoluta y razón de mezcla — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}`, name === 'ah' ? 'AH g/m³' : 'MR g/kg']}
            />
            <Line type="monotone" dataKey="ah" stroke={ahC} strokeWidth={2} dot={false} name="ah" />
            <Line type="monotone" dataKey="mr" stroke="#38bdf8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="mr" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 7-day daily */}
      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {data.daily.map((d, i) => {
          const c2 = ahColor(d.avgAbsHumidity)
          return (
            <div key={i} className="text-center">
              <div className="text-[7px] text-slate-600">{d.label.slice(0, 3)}</div>
              <div className="mt-0.5 h-7 rounded flex items-center justify-center" style={{
                background: c2 + '20', border: `1px solid ${c2}33`,
              }}>
                <span className="text-[7px] font-bold" style={{ color: c2 }}>{d.avgAbsHumidity}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Fórmula de Tetens · AH = humedad absoluta · MR = razón de mezcla (g/kg) · P.vapor en hPa
      </div>
    </div>
  )
}
