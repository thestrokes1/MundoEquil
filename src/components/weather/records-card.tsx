'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecordsData } from '@/app/api/records/route'
import type { WeatherData } from '@/types/weather'

export function RecordsCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  const { data, isLoading } = useQuery<RecordsData>({
    queryKey: ['records', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/records?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-36 bg-white/10" />
      </div>
    )
  }

  if (!data || !('recordHigh' in data)) return null

  const todayMax = weather?.daily?.[0]?.tempMax ?? null
  const todayMin = weather?.daily?.[0]?.tempMin ?? null

  const nearRecord = todayMax !== null && data.recordHigh !== null && todayMax >= data.recordHigh - 2
  const nearRecordLow = todayMin !== null && data.recordLow !== null && todayMin <= data.recordLow + 2

  const now = new Date()
  const dateLabel = now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })

  function vs(current: number | null, ref: number | null, isHigh: boolean): string {
    if (current === null || ref === null) return ''
    const diff = isHigh ? current - ref : ref - current
    if (diff > 2) return `${diff.toFixed(1)}°C bajo récord`
    if (diff > 0) return 'Cerca del récord'
    if (diff === 0) return '¡Igualando el récord!'
    return `${Math.abs(diff).toFixed(1)}°C por encima`
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">📊 Récords Históricos</h3>
      <div className="text-xs text-slate-500 mb-4">{dateLabel} · últimos {data.yearsQueried} años (±5 días)</div>

      {nearRecord && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          🌡 Mañana se acerca al récord de calor para esta fecha ({data.recordHigh}°C en {data.recordHighYear})
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Record High */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-red-400 font-medium mb-1">Récord máximo</div>
          <div className="text-2xl font-bold text-red-300">
            {data.recordHigh !== null ? `${data.recordHigh}°C` : '—'}
          </div>
          {data.recordHighYear && (
            <div className="text-[10px] text-red-400/60 mt-0.5">en {data.recordHighYear}</div>
          )}
          {todayMax !== null && data.recordHigh !== null && (
            <div className="text-[10px] text-slate-500 mt-1.5 leading-tight">{vs(todayMax, data.recordHigh, true)}</div>
          )}
        </div>

        {/* Record Low */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-blue-400 font-medium mb-1">Récord mínimo</div>
          <div className="text-2xl font-bold text-blue-300">
            {data.recordLow !== null ? `${data.recordLow}°C` : '—'}
          </div>
          {data.recordLowYear && (
            <div className="text-[10px] text-blue-400/60 mt-0.5">en {data.recordLowYear}</div>
          )}
          {todayMin !== null && data.recordLow !== null && (
            <div className="text-[10px] text-slate-500 mt-1.5 leading-tight">{vs(todayMin, data.recordLow, false)}</div>
          )}
        </div>
      </div>

      {/* Historical average comparison */}
      <div className="space-y-2 text-xs">
        {data.avgHigh !== null && todayMax !== null && (
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
            <span className="text-slate-400">Promedio histórico máx.</span>
            <div className="text-right">
              <span className="text-slate-200 font-semibold">{data.avgHigh}°C</span>
              {todayMax > data.avgHigh + 2 && <span className="text-red-400 ml-2 text-[10px]">+{(todayMax - data.avgHigh).toFixed(1)}°</span>}
              {todayMax < data.avgHigh - 2 && <span className="text-blue-400 ml-2 text-[10px]">{(todayMax - data.avgHigh).toFixed(1)}°</span>}
            </div>
          </div>
        )}
        {data.avgLow !== null && todayMin !== null && (
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
            <span className="text-slate-400">Promedio histórico mín.</span>
            <div className="text-right">
              <span className="text-slate-200 font-semibold">{data.avgLow}°C</span>
              {todayMin > data.avgLow + 2 && <span className="text-red-400 ml-2 text-[10px]">+{(todayMin - data.avgLow).toFixed(1)}°</span>}
              {todayMin < data.avgLow - 2 && <span className="text-blue-400 ml-2 text-[10px]">{(todayMin - data.avgLow).toFixed(1)}°</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
