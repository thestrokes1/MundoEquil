'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { SunshineData } from '@/app/api/sunshine-hours/route'

const RATING_CONFIG = {
  excellent: { label: 'Excelente',   color: '#fbbf24' },
  good:      { label: 'Bueno',       color: '#facc15' },
  fair:      { label: 'Regular',     color: '#a3e635' },
  poor:      { label: 'Nublado',     color: '#94a3b8' },
  overcast:  { label: 'Cubierto',    color: '#475569' },
}

export function SunshineHoursCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<SunshineData>({
    queryKey: ['sunshine-hours', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/sunshine-hours?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
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

  if (!data || 'error' in data || !data.days?.length) return null

  const cfg = RATING_CONFIG[data.sunshineRating]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">☀️ Horas de Sol</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cfg.color, borderColor: cfg.color + '44', background: cfg.color + '1a',
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Sol hoy</div>
          <div className="text-2xl font-bold" style={{ color: cfg.color }}>{data.todaySunshineH}h</div>
          <div className="text-[9px] text-slate-500">de {data.theoreticalMax}h</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Porcentaje</div>
          <div className="text-2xl font-bold text-slate-200">{data.sunshinePercent}%</div>
          <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${data.sunshinePercent}%`, background: cfg.color }} />
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Sol pleno</div>
          <div className="text-2xl font-bold text-slate-200">{data.brightSunshineH}h</div>
          <div className="text-[9px] text-slate-500">sin nubes</div>
        </div>
      </div>

      {/* Sunrise/Sunset */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5">
          <span className="text-base">🌅</span>
          <div>
            <div className="text-[9px] text-slate-600">Amanecer</div>
            <div className="text-xs font-semibold text-amber-300">{data.todaySunrise}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5">
          <span className="text-base">🌇</span>
          <div>
            <div className="text-[9px] text-slate-600">Atardecer</div>
            <div className="text-xs font-semibold text-orange-400">{data.todaySunset}</div>
          </div>
        </div>
      </div>

      {/* 7-day bars */}
      <div className="text-[10px] text-slate-600 mb-2">Horas de sol — 7 días</div>
      <div className="space-y-1.5">
        {data.days.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 w-16">{d.label}</span>
            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${d.percent}%`, background: d.color }}
              />
            </div>
            <span className="text-[9px] font-medium w-8 text-right" style={{ color: d.color }}>{d.hours}h</span>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[9px] text-slate-600 text-center">
        Media 7 días: {data.monthlyAvg}h/día
      </div>
    </div>
  )
}
