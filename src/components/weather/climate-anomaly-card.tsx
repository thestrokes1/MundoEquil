'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LineChart, Line
} from 'recharts'
import type { ClimateAnomalyData } from '@/app/api/climate-anomaly/route'

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function anomalyColor(delta: number) {
  if (delta > 3)  return '#f87171'
  if (delta > 1.5) return '#fb923c'
  if (delta > 0.5) return '#facc15'
  if (delta > -0.5) return '#4ade80'
  if (delta > -1.5) return '#38bdf8'
  return '#818cf8'
}

function precipAnomalyColor(delta: number) {
  if (delta > 50)  return '#38bdf8'
  if (delta > 20)  return '#7dd3fc'
  if (delta > -20) return '#4ade80'
  if (delta > -50) return '#facc15'
  return '#f87171'
}

export function ClimateAnomalyCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<ClimateAnomalyData>({
    queryKey: ['climate-anomaly', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/climate-anomaly?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
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

  if (!data || !data.normals?.length) return null

  const monthName = new Date(2024, data.currentMonth - 1, 1).toLocaleDateString('es-MX', { month: 'long' })

  // Annual temp range chart
  const tempData = data.normals.map((n, i) => ({
    mes: MONTHS_SHORT[i],
    max: n.avgTempMax,
    min: n.avgTempMin,
    current: i + 1 === data.currentMonth,
  }))

  // Precip annual
  const precipData = data.normals.map((n, i) => ({
    mes: MONTHS_SHORT[i],
    precip: n.avgPrecip,
    current: i + 1 === data.currentMonth,
  }))

  const anomMax = data.anomalyMax
  const anomMin = data.anomalyMin
  const anomPrec = data.anomalyPrecipMm

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">📈 Anomalías Climáticas</h3>
        <span className="text-[10px] text-slate-600">vs. norma 1991–2020</span>
      </div>
      <div className="text-xs text-slate-500 mb-4 capitalize">{monthName} actual</div>

      {/* Anomaly indicators */}
      <div className="grid grid-cols-3 gap-2 mb-5 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Temp. máx.</div>
          <div className="font-bold text-xl" style={{ color: anomalyColor(anomMax) }}>
            {anomMax > 0 ? '+' : ''}{anomMax}°C
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">vs {data.normals[data.currentMonth-1]?.avgTempMax}°C normal</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Temp. mín.</div>
          <div className="font-bold text-xl" style={{ color: anomalyColor(anomMin) }}>
            {anomMin > 0 ? '+' : ''}{anomMin}°C
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">vs {data.normals[data.currentMonth-1]?.avgTempMin}°C normal</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Lluvia del mes</div>
          <div className="font-bold text-xl" style={{ color: precipAnomalyColor(anomPrec) }}>
            {anomPrec > 0 ? '+' : ''}{anomPrec} mm
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">vs {data.normalPrecip} mm normal</div>
        </div>
      </div>

      {/* Warming trend */}
      {Math.abs(data.warmingTrend) > 0.1 && (
        <div className={`mb-4 px-3 py-2 rounded-xl text-xs border ${
          data.warmingTrend > 0
            ? 'border-red-500/20 bg-red-500/10 text-red-300'
            : 'border-blue-500/20 bg-blue-500/10 text-blue-300'
        }`}>
          {data.warmingTrend > 0 ? '🌡 Tendencia de calentamiento: ' : '❄️ Tendencia de enfriamiento: '}
          <strong>{data.warmingTrend > 0 ? '+' : ''}{data.warmingTrend}°C</strong> vs. inicio del período 1991–2020
        </div>
      )}

      {/* Annual temperature normals chart */}
      <div className="text-[10px] text-slate-600 mb-1">Temperatura normal mensual (°C)</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={tempData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 8, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown, name: unknown) => [`${v}°C`, name === 'max' ? 'Máx. normal' : 'Mín. normal']}
            />
            <Line type="monotone" dataKey="max" stroke="#fb923c" strokeWidth={1.5} dot={(p) => {
              if (!p.payload?.current) return <g key={p.key} />
              return <circle key={p.key} cx={p.cx} cy={p.cy} r={4} fill="#fb923c" stroke="#fff" strokeWidth={1.5} />
            }} />
            <Line type="monotone" dataKey="min" stroke="#38bdf8" strokeWidth={1.5} dot={(p) => {
              if (!p.payload?.current) return <g key={p.key} />
              return <circle key={p.key} cx={p.cx} cy={p.cy} r={4} fill="#38bdf8" stroke="#fff" strokeWidth={1.5} />
            }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Precipitation normals */}
      <div className="text-[10px] text-slate-600 mt-3 mb-1">Lluvia normal mensual (mm)</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={precipData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 8, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v} mm`, 'Lluvia normal']}
            />
            <Bar dataKey="precip" radius={[2, 2, 0, 0]} maxBarSize={16}>
              {precipData.map((d, i) => (
                <Cell key={i} fill={d.current ? '#38bdf8' : '#334155'} fillOpacity={d.current ? 1 : 0.6} />
              ))}
            </Bar>
            <ReferenceLine y={data.monthlyPrecip} stroke="#4ade80" strokeDasharray="3 3" strokeOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[9px] text-slate-700 text-center">
        Fuente: ERA5 reanalysis · Normas climáticas 1991–2020 (WMO)
      </div>
    </div>
  )
}
