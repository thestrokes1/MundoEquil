'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExtremeEventsData } from '@/app/api/extreme-events/route'
import type { WeatherData } from '@/types/weather'

const RETURN_COLORS = ['#4ade80', '#a3e635', '#facc15', '#fb923c', '#f87171']

export function ExtremeEventsCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  const { data, isLoading } = useQuery<ExtremeEventsData>({
    queryKey: ['extreme-events', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/extreme-events?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-52 bg-white/10" />
      </div>
    )
  }

  if (!data || !('returnPeriods' in data) || !data.returnPeriods?.length) return null

  const todayMax = weather?.daily?.[0]?.tempMax ?? null
  const todayPrecip = weather?.daily?.[0]?.precipitation ?? null

  // Find which return period today's temp would breach
  const tempExceedance = todayMax !== null
    ? data.returnPeriods.findLast(rp => todayMax >= rp.tempHigh)
    : null

  const precipExceedance = todayPrecip !== null && todayPrecip > 0
    ? data.returnPeriods.findLast(rp => todayPrecip >= rp.precipMm)
    : null

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">📊 Eventos Extremos</h3>
        <span className="text-[10px] text-slate-600">Distribución Gumbel · {data.dataYears} años</span>
      </div>
      <div className="text-xs text-slate-500 mb-4">Umbrales de temperatura y precipitación por período de retorno</div>

      {/* Current temp anomaly */}
      <div className="mb-4 bg-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs">
        <div>
          <div className="text-slate-400 font-medium">Anomalía térmica reciente</div>
          <div className="text-[10px] text-slate-600 mt-0.5">Últimos 10 años vs. período completo</div>
        </div>
        <div className="text-2xl font-bold" style={{
          color: data.currentTempAnomaly > 0.5 ? '#f87171' : data.currentTempAnomaly < -0.5 ? '#38bdf8' : '#4ade80'
        }}>
          {data.currentTempAnomaly > 0 ? '+' : ''}{data.currentTempAnomaly}°C
        </div>
      </div>

      {/* Exceedance alerts */}
      {tempExceedance && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-red-500/20 bg-red-500/10 text-red-300">
          🌡 Temperatura de hoy ({todayMax}°C) alcanza nivel de evento 1-en-{tempExceedance.years}-años ({tempExceedance.tempHigh}°C)
        </div>
      )}
      {precipExceedance && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs border border-blue-500/20 bg-blue-500/10 text-blue-300">
          🌧 Lluvia de hoy ({todayPrecip} mm) alcanza nivel de evento 1-en-{precipExceedance.years}-años ({precipExceedance.precipMm} mm)
        </div>
      )}

      {/* Return period table */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-4 gap-2 text-[9px] text-slate-600 px-1 mb-1">
          <span>Período</span>
          <span className="text-right">Temp. máx.</span>
          <span className="text-right">Temp. mín.</span>
          <span className="text-right">Lluvia/día</span>
        </div>
        {data.returnPeriods.map((rp, i) => {
          const col = RETURN_COLORS[i]
          return (
            <div key={rp.years} className="grid grid-cols-4 gap-2 px-3 py-2 rounded-xl text-xs" style={{
              background: col + '0d', border: `1px solid ${col}22`
            }}>
              <span className="font-bold" style={{ color: col }}>1:{rp.years}a</span>
              <span className="text-right text-slate-300">{rp.tempHigh}°C</span>
              <span className="text-right text-slate-300">{rp.tempLow}°C</span>
              <span className="text-right text-slate-300">{rp.precipMm} mm</span>
            </div>
          )
        })}
      </div>

      {/* Historical extremes */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-red-400 mb-0.5">Máx. histórica</div>
          <div className="font-bold text-red-300">{data.maxTemp}°C</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-blue-400 mb-0.5">Mín. histórica</div>
          <div className="font-bold text-blue-300">{data.minTemp}°C</div>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-sky-400 mb-0.5">Lluvia récord</div>
          <div className="font-bold text-sky-300">{data.maxDailyPrecip} mm</div>
        </div>
      </div>

      <div className="mt-3 text-[9px] text-slate-700 text-center">
        Análisis estadístico de valores extremos (EVT) · Distribución de Gumbel (GEV tipo I)
      </div>
    </div>
  )
}
