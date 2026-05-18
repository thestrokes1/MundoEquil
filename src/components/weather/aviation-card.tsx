'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { AviationData } from '@/app/api/aviation/route'

const CAT_META = {
  VFR:  { label: 'VFR',  desc: 'Visual — condiciones ideales',  color: '#22c55e' },
  MVFR: { label: 'MVFR', desc: 'Visual marginal',               color: '#38bdf8' },
  IFR:  { label: 'IFR',  desc: 'Instrumental requerido',        color: '#f87171' },
  LIFR: { label: 'LIFR', desc: 'IFR bajo — muy peligroso',      color: '#a855f7' },
}

const TURB_LABEL = { low: 'Baja', moderate: 'Moderada', severe: 'Severa', extreme: 'Extrema' }
const TURB_COLOR = { low: '#22c55e', moderate: '#eab308', severe: '#f97316', extreme: '#ef4444' }
const ICING_LABEL = { nil: 'Nulo', trace: 'Traza', light: 'Leve', moderate: 'Moderado', severe: 'Severo' }
const ICING_COLOR = { nil: '#22c55e', trace: '#84cc16', light: '#eab308', moderate: '#f97316', severe: '#ef4444' }

export function AviationCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<AviationData>({
    queryKey: ['aviation', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/aviation?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 1_800_000,
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

  const cat = CAT_META[data.flightCategory]
  const turbColor = TURB_COLOR[data.turbulenceRisk]
  const icingColor = ICING_COLOR[data.icingRisk]

  const chartData = data.hours.filter((_, i) => i % 2 === 0).map(h => ({
    hour: h.hour,
    vis: h.visibility,
    ceil: Math.min(h.ceiling, 3000),
    color: h.categoryColor,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">✈️ Meteorología Aeronáutica</h3>
        <span className="text-xs font-bold px-3 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a',
        }}>
          {cat.label}
        </span>
      </div>

      {/* Category description */}
      <div className="mb-4 px-3 py-2 rounded-xl text-xs border" style={{
        borderColor: cat.color + '30', background: cat.color + '10', color: cat.color,
      }}>
        {cat.desc}
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Techo</div>
          <div className="text-2xl font-bold text-slate-200">{data.ceiling >= 3000 ? '3000+' : data.ceiling}</div>
          <div className="text-[9px] text-slate-500">m AGL</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Visibilidad</div>
          <div className="text-2xl font-bold text-slate-200">{data.visibility}</div>
          <div className="text-[9px] text-slate-500">km</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Alt. densidad</div>
          <div className="text-xl font-bold text-slate-200">{data.densityAltitude}</div>
          <div className="text-[9px] text-slate-500">m</div>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-2.5">
          <span className="text-sm">🌀</span>
          <div>
            <div className="text-[9px] text-slate-600">Turbulencia</div>
            <div className="text-xs font-semibold" style={{ color: turbColor }}>
              {TURB_LABEL[data.turbulenceRisk]}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-2.5">
          <span className="text-sm">🧊</span>
          <div>
            <div className="text-[9px] text-slate-600">Engelamiento</div>
            <div className="text-xs font-semibold" style={{ color: icingColor }}>
              {ICING_LABEL[data.icingRisk]}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-2.5">
          <span className="text-sm">💨</span>
          <div>
            <div className="text-[9px] text-slate-600">Cizalladura</div>
            <div className="text-xs font-semibold text-slate-300">{data.windShear} kt</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-2.5">
          <span className="text-sm">📊</span>
          <div>
            <div className="text-[9px] text-slate-600">Alt. presión</div>
            <div className="text-xs font-semibold text-slate-300">{data.pressureAlt} m</div>
          </div>
        </div>
      </div>

      {/* 48h category chart */}
      <div className="text-[10px] text-slate-600 mb-1">Categoría de vuelo — 48h (visibilidad km)</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -24 }} barSize={6}>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={5} />
            <YAxis domain={[0, 15]} tick={{ fontSize: 7, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v} km`, 'Visibilidad']}
            />
            <Bar dataKey="vis">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-3 justify-center">
        {Object.entries(CAT_META).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: v.color }} />
            <span className="text-[8px] text-slate-600">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
