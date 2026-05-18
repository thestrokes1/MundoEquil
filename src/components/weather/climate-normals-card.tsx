'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ClimateNormalsData } from '@/app/api/climate-normals/route'

export function ClimateNormalsCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ClimateNormalsData>({
    queryKey: ['climate-normals', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/climate-normals?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
    refetchInterval: false,
    retry: false,
  })

  if (!location || isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-52 bg-white/10" />
        <Skeleton className="h-56 bg-white/10" />
      </div>
    )
  }

  if (!data || 'error' in data) return null

  const today = data.today
  const anomMaxColor = today.anomalyMax > 2 ? '#f87171' : today.anomalyMax < -2 ? '#60a5fa' : '#94a3b8'
  const anomMinColor = today.anomalyMin > 2 ? '#f87171' : today.anomalyMin < -2 ? '#60a5fa' : '#94a3b8'

  const chartData = data.monthly.map(m => ({
    mes: m.month,
    max: m.normalMax,
    min: m.normalMin,
    precip: m.normalPrecip,
    current: m.isCurrentMonth,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">📊 Normales Climáticas</h3>
        <span className="text-xs text-slate-500">ERA5 10 años</span>
      </div>

      {/* Today vs normal */}
      <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10">
        <div className="text-[10px] text-slate-500 mb-2">Hoy vs. normal</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] text-slate-600">Máx observada</div>
            <div className="text-lg font-bold text-slate-300">{today.observedMax}°</div>
            <div className="text-xs" style={{ color: anomMaxColor }}>
              {today.anomalyMax > 0 ? '+' : ''}{today.anomalyMax}° vs normal {today.normalMax}°
            </div>
          </div>
          <div>
            <div className="text-[9px] text-slate-600">Mín observada</div>
            <div className="text-lg font-bold text-slate-300">{today.observedMin}°</div>
            <div className="text-xs" style={{ color: anomMinColor }}>
              {today.anomalyMin > 0 ? '+' : ''}{today.anomalyMin}° vs normal {today.normalMin}°
            </div>
          </div>
        </div>
        <div className="mt-2 flex gap-4 text-[9px] text-slate-600">
          <span>Récord máx. estimado: <span className="text-red-400 font-bold">{today.recordHigh}°</span></span>
          <span>Récord mín. estimado: <span className="text-blue-400 font-bold">{today.recordLow}°</span></span>
        </div>
      </div>

      {/* Current year summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">T max media</div>
          <div className="font-bold text-sm text-red-400">{data.currentYear.avgMax}°</div>
          <div className="text-[7px] text-slate-700">este año</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">T min media</div>
          <div className="font-bold text-sm text-blue-400">{data.currentYear.avgMin}°</div>
          <div className="text-[7px] text-slate-700">este año</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-[8px] text-slate-600">Precipitación</div>
          <div className="font-bold text-sm text-sky-400">{data.currentYear.totalPrecip} mm</div>
          <div className="text-[7px] text-slate-700">acumulada</div>
        </div>
      </div>

      {/* Monthly normals chart */}
      <div className="text-[10px] text-slate-600 mb-1">Normales mensuales — T° y precipitación</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 7, fill: '#475569' }} />
            <YAxis yAxisId="temp" tick={{ fontSize: 7, fill: '#475569' }} unit="°" />
            <YAxis yAxisId="pr" orientation="right" tick={{ fontSize: 7, fill: '#475569' }} unit="mm" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => {
                if (name === 'max') return [`${v}°`, 'T max normal']
                if (name === 'min') return [`${v}°`, 'T min normal']
                return [`${v} mm`, 'Precip normal']
              }}
            />
            <Bar yAxisId="pr" dataKey="precip" radius={[2, 2, 0, 0]} maxBarSize={14} fillOpacity={0.4}>
              {chartData.map((d, i) => <Cell key={i} fill={d.current ? '#38bdf8' : '#334155'} />)}
            </Bar>
            <Line yAxisId="temp" type="monotone" dataKey="max" stroke="#f87171" strokeWidth={1.5} dot={(p: { payload: { current: boolean }; cx?: number; cy?: number }) => p.payload.current ? <circle cx={p.cx} cy={p.cy} r={3} fill="#f87171" /> : false as never} />
            <Line yAxisId="temp" type="monotone" dataKey="min" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Normales calculadas con ERA5 1991–{new Date().getFullYear() - 1} · Dot = mes actual
      </div>
    </div>
  )
}
