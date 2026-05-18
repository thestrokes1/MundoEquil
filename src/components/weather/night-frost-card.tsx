'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { NightFrostData } from '@/app/api/night-frost/route'

const RISK_CONFIG = {
  none:     { label: 'Sin helada',     color: '#22c55e', bg: '#22c55e15' },
  slight:   { label: 'Helada leve',    color: '#84cc16', bg: '#84cc1615' },
  moderate: { label: 'Helada moderada',color: '#f97316', bg: '#f9731615' },
  severe:   { label: 'Helada severa',  color: '#ef4444', bg: '#ef444415' },
}

function TempCell({ minTemp, frostRisk, label, frostProb }: {
  minTemp: number; frostRisk: NightFrostData['days'][0]['frostRisk']; label: string; frostProb: number
}) {
  const cfg = RISK_CONFIG[frostRisk]
  return (
    <div className="text-center">
      <div className="text-[7px] text-slate-600 mb-0.5">{label.slice(0, 3)}</div>
      <div className="h-10 rounded-lg flex flex-col items-center justify-center gap-0.5"
        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
        <span className="text-[9px] font-bold" style={{ color: cfg.color }}>{minTemp}°</span>
        {frostProb > 0 && <span className="text-[7px] text-slate-600">{frostProb}%</span>}
      </div>
    </div>
  )
}

export function NightFrostCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<NightFrostData>({
    queryKey: ['night-frost', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/night-frost?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/10" />
        <Skeleton className="h-44 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const tonightRisk = data.frostTonight ? 'severe' : data.frostProbability >= 50 ? 'moderate' : data.frostProbability >= 20 ? 'slight' : 'none'
  const cfg = RISK_CONFIG[tonightRisk]
  const tempColor = data.minTempTonight <= 0 ? '#ef4444' : data.minTempTonight <= 2 ? '#f97316' : data.minTempTonight <= 5 ? '#eab308' : '#22c55e'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌡️ Heladas Nocturnas</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cfg.color, borderColor: cfg.color + '44', background: cfg.color + '1a',
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Tonight summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Mín. esta noche</div>
          <div className="text-3xl font-bold" style={{ color: tempColor }}>{data.minTempTonight}°</div>
          <div className="text-[9px] text-slate-500">°C</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">P(helada)</div>
          <div className="text-2xl font-bold text-slate-200">{data.frostProbability}%</div>
          <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${data.frostProbability}%`, background: cfg.color }} />
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Helada suelo</div>
          <div className="text-lg mt-1">
            {data.groundFrostRisk ? '🟠 Sí' : '🟢 No'}
          </div>
        </div>
      </div>

      {/* Frost window */}
      {data.frostTonight && data.firstFrostHour && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-red-500/20 bg-red-500/10 text-red-300">
          ❄️ Helada: {data.firstFrostHour} – {data.lastFrostHour} ({data.frostDuration}h bajo 0°C)
        </div>
      )}

      {!data.frostTonight && data.groundFrostRisk && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-orange-500/20 bg-orange-500/10 text-orange-300">
          🌿 Temperatura próxima a 0°C — riesgo de helada en plantas sensibles
        </div>
      )}

      {/* 7-day grid */}
      <div className="text-[10px] text-slate-600 mb-2">Temperatura mínima — 7 días</div>
      <div className="grid grid-cols-7 gap-0.5">
        {data.days.map((d, i) => (
          <TempCell key={i} minTemp={d.minTemp} frostRisk={d.frostRisk} label={d.label} frostProb={d.frostProb} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-3 flex-wrap">
        {Object.entries(RISK_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: v.color }} />
            <span className="text-[8px] text-slate-600">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
