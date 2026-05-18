'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { PrecipTypeDetailData, PrecipEvent } from '@/app/api/precipitation-type-detail/route'

const TYPE_LABEL: Record<PrecipEvent['type'], string> = {
  none:          'Sin precipitación',
  drizzle:       'Llovizna',
  rain:          'Lluvia',
  snow:          'Nieve',
  sleet:         'Aguanieve',
  freezing_rain: 'Lluvia engelante',
  hail:          'Granizo',
}

const TYPE_COLOR: Record<PrecipEvent['type'], string> = {
  none:          '#475569',
  drizzle:       '#7dd3fc',
  rain:          '#38bdf8',
  snow:          '#e2e8f0',
  sleet:         '#a5b4fc',
  freezing_rain: '#818cf8',
  hail:          '#fb923c',
}

export function PrecipTypeDetailCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<PrecipTypeDetailData>({
    queryKey: ['precipitation-type-detail', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/precipitation-type-detail?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-48 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data || !data.days?.length) return null

  const cur = data.current
  const curColor = TYPE_COLOR[cur.type]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌧️ Tipo de Precipitación</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: curColor, borderColor: curColor + '44', background: curColor + '1a',
        }}>
          {cur.emoji} {TYPE_LABEL[cur.type]}
        </span>
      </div>

      {/* Alerts */}
      {data.freezingRainRisk && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-indigo-400/30 bg-indigo-400/10 text-indigo-300">
          🧊 Lluvia engelante posible en las próximas 24h — vías resbaladizas
        </div>
      )}
      {data.sleetRisk && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-purple-400/30 bg-purple-400/10 text-purple-300">
          🌨️ Aguanieve posible — mezcla de lluvia y nieve
        </div>
      )}

      {/* 24h summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Lluvia 24h</div>
          <div className="text-2xl font-bold text-sky-400">{data.totalRain}</div>
          <div className="text-[9px] text-slate-500">mm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Nieve 24h</div>
          <div className="text-2xl font-bold text-slate-300">{data.totalSnow}</div>
          <div className="text-[9px] text-slate-500">cm</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600">Acum. nieve</div>
          <div className="text-2xl font-bold text-slate-300">{data.snowDepthCm}</div>
          <div className="text-[9px] text-slate-500">mm eq.</div>
        </div>
      </div>

      {/* 24h hourly strip */}
      <div className="text-[10px] text-slate-600 mb-1.5">Tipo por hora — 24h</div>
      <div className="flex gap-0.5">
        {data.next24h.map((e, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${e.hour} — ${e.description}`}>
            <div className="text-[8px]">{e.emoji}</div>
            <div className="w-full h-3 rounded-sm" style={{ background: e.color + (e.type === 'none' ? '20' : '80') }} />
            {i % 6 === 0 && <div className="text-[6px] text-slate-700">{e.hour.slice(0, 2)}h</div>}
          </div>
        ))}
      </div>

      {/* 7-day summary */}
      <div className="mt-4 text-[10px] text-slate-600 mb-2">Resumen 7 días</div>
      <div className="grid grid-cols-7 gap-0.5">
        {data.days.map((d, i) => (
          <div key={i} className="text-center">
            <div className="text-[7px] text-slate-600">{d.label.slice(0, 3)}</div>
            <div className="mt-0.5 h-10 rounded flex flex-col items-center justify-center gap-0.5"
              style={{ background: d.color + '18', border: `1px solid ${d.color}30` }}>
              {d.rainMm > 0 && (
                <span className="text-[7px] font-bold text-sky-400">{d.rainMm}mm</span>
              )}
              {d.snowCm > 0 && (
                <span className="text-[7px] font-bold text-slate-300">{d.snowCm}mm</span>
              )}
              {d.rainMm === 0 && d.snowCm === 0 && (
                <span className="text-[7px] text-slate-700">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
