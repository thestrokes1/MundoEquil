'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ConvectiveOutlookData } from '@/app/api/convective-outlook/route'

const CAT_CONFIG: Record<ConvectiveOutlookData['outlookCategory'], { label: string; color: string; abbr: string }> = {
  general:  { label: 'General',   color: '#94a3b8', abbr: 'GEN' },
  marginal: { label: 'Marginal',  color: '#4ade80', abbr: 'MRGL' },
  slight:   { label: 'Leve',      color: '#facc15', abbr: 'SLGT' },
  enhanced: { label: 'Aumentado', color: '#fb923c', abbr: 'ENH' },
  moderate: { label: 'Moderado',  color: '#f87171', abbr: 'MDT' },
  high:     { label: 'Alto',      color: '#dc2626', abbr: 'HIGH' },
}

export function ConvectiveOutlookCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ConvectiveOutlookData>({
    queryKey: ['convective-outlook', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/convective-outlook?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 1_800_000,
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

  if (!data || 'error' in data || !data.days?.length) return null

  const cat = CAT_CONFIG[data.outlookCategory] ?? CAT_CONFIG['general']
  const chartData = data.days.map(d => ({
    label: d.label.slice(0, 5),
    prob: d.convectiveProb,
    cape: Math.min(100, d.maxCape / 40),
    cat: d.outlookCategory,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">⛈️ Perspectiva Convectiva</h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl border font-mono" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a',
        }}>
          {cat.abbr} — {cat.label}
        </span>
      </div>

      {/* Current params */}
      <div className="grid grid-cols-4 gap-1.5 mb-4 text-xs">
        {[
          { label: 'CAPE', value: `${data.currentParams.cape}`, unit: 'J/kg', color: data.currentParams.cape > 1000 ? '#f97316' : '#94a3b8' },
          { label: 'LI', value: `${data.currentParams.li}`, unit: 'K', color: data.currentParams.li < -3 ? '#f97316' : '#94a3b8' },
          { label: 'Ciz', value: `${data.currentParams.shear}`, unit: 'm/s', color: data.currentParams.shear > 15 ? '#f97316' : '#94a3b8' },
          { label: 'KI', value: `${data.currentParams.ki}`, unit: '', color: data.currentParams.ki > 30 ? '#f97316' : '#94a3b8' },
        ].map(p => (
          <div key={p.label} className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-[8px] text-slate-600">{p.label}</div>
            <div className="font-bold text-sm" style={{ color: p.color }}>{p.value}</div>
            <div className="text-[7px] text-slate-700">{p.unit}</div>
          </div>
        ))}
      </div>

      {/* 5-day outlook bars */}
      <div className="text-[10px] text-slate-600 mb-1">Índice convectivo 5 días</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#475569' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} unit="%" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}%`, 'Prob. convectiva']}
            />
            <Bar dataKey="prob" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {chartData.map((d, i) => <Cell key={i} fill={CAT_CONFIG[d.cat as ConvectiveOutlookData['outlookCategory']].color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category scale legend */}
      <div className="mt-3 flex gap-1 justify-center flex-wrap">
        {(Object.entries(CAT_CONFIG) as [ConvectiveOutlookData['outlookCategory'], typeof CAT_CONFIG['general']][]).map(([key, v]) => (
          <span key={key} className="text-[8px] px-1.5 py-0.5 rounded font-mono font-bold" style={{
            color: v.color, background: v.color + '20',
          }}>{v.abbr}</span>
        ))}
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        CAPE, LI, KI y cizalladura vertical · Clasificación SPC adaptada
      </div>
    </div>
  )
}
