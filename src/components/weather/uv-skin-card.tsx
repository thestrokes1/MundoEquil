'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { UVSkinData } from '@/app/api/uv-skin/route'

function uvColor(uv: number) {
  if (uv >= 11) return '#9333ea'
  if (uv >= 8) return '#ef4444'
  if (uv >= 6) return '#f97316'
  if (uv >= 3) return '#eab308'
  if (uv >= 1) return '#22c55e'
  return '#94a3b8'
}

function uvLabel(uv: number) {
  if (uv >= 11) return 'Extremo'
  if (uv >= 8) return 'Muy alto'
  if (uv >= 6) return 'Alto'
  if (uv >= 3) return 'Moderado'
  if (uv >= 1) return 'Bajo'
  return 'Mínimo'
}

function formatBurnTime(min: number): string {
  if (min >= 999) return '∞'
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}min`
  return `${min} min`
}

export function UVSkinCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<UVSkinData>({
    queryKey: ['uv-skin', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/uv-skin?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.hours?.length) return null

  const color = uvColor(data.maxUV)
  const chartData = data.hours.map(h => ({ hour: h.hour, uv: h.uv }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">☀️ UV y Tiempo de Quemadura</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color, borderColor: color + '44', background: color + '1a',
        }}>
          UV {data.maxUV} — {uvLabel(data.maxUV)}
        </span>
      </div>

      {/* SPF + peak */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">UV máx. hoy</div>
          <div className="text-3xl font-bold" style={{ color }}>{data.maxUV}</div>
          <div className="text-[9px] text-slate-500 mt-0.5">a las {data.maxUVTime}</div>
        </div>
        {data.spfRecommendation > 0 && (
          <div className="flex-1 bg-white/5 rounded-2xl p-3 text-center">
            <div className="text-[9px] text-slate-600 mb-1">SPF recomendado</div>
            <div className="text-3xl font-bold text-amber-400">SPF {data.spfRecommendation}</div>
          </div>
        )}
      </div>

      {/* Protection tips */}
      {data.protection.length > 0 && (
        <div className="mb-3 space-y-0.5">
          {data.protection.map((p, i) => (
            <div key={i} className="text-[10px] text-amber-400 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
              {p}
            </div>
          ))}
        </div>
      )}

      {/* Burn time by skin type */}
      <div className="text-[10px] text-slate-600 mb-1.5">Tiempo de quemadura por fototipo (UV máx.)</div>
      <div className="grid grid-cols-6 gap-1 mb-4">
        {data.skinTypes.map(st => (
          <div key={st.type} className="rounded-xl p-1.5 text-center" style={{ background: st.color + '25', border: `1px solid ${st.color}40` }}>
            <div className="text-[8px] font-bold text-slate-300">T{st.type}</div>
            <div className="text-[9px] font-bold mt-0.5" style={{ color: uvColor(data.maxUV) }}>
              {formatBurnTime(st.burnTime)}
            </div>
          </div>
        ))}
      </div>

      {/* UV curve today */}
      <div className="text-[10px] text-slate-600 mb-1">Índice UV — hoy</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={3} />
            <YAxis tick={{ fontSize: 7, fill: '#475569' }} domain={[0, Math.max(12, data.maxUV + 1)]} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}`, 'UV']}
            />
            <ReferenceLine y={6} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={11} stroke="#9333ea" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Area type="monotone" dataKey="uv" stroke={color} fill="url(#uvGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Fórmula Diffey · T1 piel muy clara → T6 piel muy oscura
      </div>
    </div>
  )
}
