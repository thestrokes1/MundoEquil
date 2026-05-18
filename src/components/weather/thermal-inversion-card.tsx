'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { ThermalInversionData } from '@/app/api/thermal-inversion/route'

const SMOG_CONFIG: Record<ThermalInversionData['smogRisk'], { label: string; color: string }> = {
  low:       { label: 'Bajo',      color: '#4ade80' },
  moderate:  { label: 'Moderado',  color: '#eab308' },
  high:      { label: 'Alto',      color: '#f97316' },
  very_high: { label: 'Muy alto',  color: '#ef4444' },
}

const STR_CONFIG: Record<ThermalInversionData['inversionStrength'], { label: string; color: string }> = {
  none:     { label: 'Sin inversión',    color: '#4ade80' },
  weak:     { label: 'Inversión débil',  color: '#a3e635' },
  moderate: { label: 'Inv. moderada',    color: '#eab308' },
  strong:   { label: 'Inv. fuerte',      color: '#f87171' },
}

export function ThermalInversionCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ThermalInversionData>({
    queryKey: ['thermal-inversion', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/thermal-inversion?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  if (!data || 'error' in data) return null

  const smog = SMOG_CONFIG[data.smogRisk]
  const str = STR_CONFIG[data.inversionStrength]

  const chartData = data.inversions.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    smog: h.smogScore,
    inv: h.inversionLikely ? h.smogScore : 0,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌫️ Inversión Térmica</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: str.color, borderColor: str.color + '44', background: str.color + '1a',
        }}>
          {str.label}
        </span>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Capa mezclada</div>
          <div className="font-bold text-lg text-slate-300">{data.currentBL}</div>
          <div className="text-[9px] text-slate-600">m</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">T − Td spread</div>
          <div className="font-bold text-lg text-slate-300">{data.currentSpread}°</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center col-span-1">
          <div className="text-[9px] text-slate-600 mb-1">Riesgo smog</div>
          <div className="font-bold text-sm" style={{ color: smog.color }}>{smog.label}</div>
        </div>
      </div>

      {data.trappingHours > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border" style={{
          borderColor: str.color + '30', background: str.color + '10', color: str.color,
        }}>
          🔒 {data.trappingHours}h de atrapamiento de contaminantes previstas
          {data.bestVentilation && ` · Mejor ventilación: ${data.bestVentilation}`}
        </div>
      )}

      {/* 48h smog score chart */}
      <div className="text-[10px] text-slate-600 mb-1">Índice de atrapamiento — 48h</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="smogGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={smog.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={smog.color} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}`, name === 'smog' ? 'Índice smog' : 'Con inversión']}
            />
            <ReferenceLine y={50} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Area type="monotone" dataKey="smog" stroke={smog.color} fill="url(#smogGrad)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="inv" stroke="#f97316" fill="url(#invGrad)" strokeWidth={0} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        BLH = altura capa límite · Spread T−Td · Inversión = condición + viento calmo + noche
      </div>
    </div>
  )
}
