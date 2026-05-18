'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { SolarPositionData } from '@/app/api/solar-position/route'

const SHADOW_CONFIG = {
  no_shadow:  { label: 'Sin sombra (sol bajo/noche)', color: '#475569' },
  very_short: { label: 'Sombra muy corta',            color: '#ef4444' },
  short:      { label: 'Sombra corta',                color: '#f97316' },
  medium:     { label: 'Sombra media',                color: '#eab308' },
  long:       { label: 'Sombra larga',                color: '#84cc16' },
  very_long:  { label: 'Sombra muy larga',            color: '#22c55e' },
}

function compassLabel(azimuth: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']
  return dirs[Math.round(azimuth / 22.5) % 16]
}

export function SolarPositionCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<SolarPositionData>({
    queryKey: ['solar-position', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/solar-position?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 900_000,
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

  if (!data || 'error' in data) return null

  const shadow = SHADOW_CONFIG[data.shadowLengthCategory]
  const altColor = data.currentAltitude > 45 ? '#ef4444' : data.currentAltitude > 30 ? '#f97316' : data.currentAltitude > 10 ? '#eab308' : '#475569'

  const chartData = data.daylightArc.map(p => ({
    hour: p.hour.slice(0, 5),
    alt: p.altitude,
  }))

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌞 Posición Solar</h3>
        {data.uvShadowRule && (
          <span className="text-[10px] px-2 py-1 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300">
            ⚠️ Regla de la sombra: UV alto
          </span>
        )}
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Altitud solar</div>
          <div className="text-2xl font-bold" style={{ color: altColor }}>{data.currentAltitude}°</div>
          <div className="text-[9px] text-slate-500">sobre horizonte</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Azimut</div>
          <div className="text-2xl font-bold text-slate-200">{data.currentAzimuth}°</div>
          <div className="text-[9px] text-slate-500">{compassLabel(data.currentAzimuth)}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-slate-600 mb-1">Sombra</div>
          <div className="text-xl font-bold text-slate-200">
            {data.shadowLength < 0 ? '∞' : `${data.shadowLength}×`}
          </div>
          <div className="text-[9px] text-slate-500">altura</div>
        </div>
      </div>

      {/* Shadow category */}
      <div className="mb-4 px-3 py-2 rounded-xl text-xs border" style={{
        borderColor: shadow.color + '30', background: shadow.color + '0e', color: shadow.color,
      }}>
        📐 {shadow.label}
        {data.uvShadowRule && <span className="ml-2 text-red-400">— Buscar sombra recomendado</span>}
      </div>

      {/* Solar noon */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white/5 rounded-xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600">Mediodía solar</div>
          <div className="text-sm font-bold text-amber-300">{data.solarNoonTime}</div>
          <div className="text-[9px] text-slate-600">{data.solarNoonAltitude}° altitud</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 text-center">
          <div className="text-[9px] text-slate-600">Sombra al mediodía</div>
          <div className="text-sm font-bold text-slate-300">
            {data.solarNoonShadow < 0 ? 'Sin sombra' : `${data.solarNoonShadow}×`}
          </div>
        </div>
      </div>

      {/* Golden / Blue hours */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
          <div className="text-[9px] text-amber-600 mb-0.5">Hora dorada mañana</div>
          <div className="text-xs font-bold text-amber-400">{data.goldenHour.morning}</div>
          <div className="text-[9px] text-amber-600 mt-1">Tarde: {data.goldenHour.evening}</div>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5">
          <div className="text-[9px] text-indigo-400 mb-0.5">Hora azul mañana</div>
          <div className="text-xs font-bold text-indigo-300">{data.blueHour.morning}</div>
          <div className="text-[9px] text-indigo-400 mt-1">Tarde: {data.blueHour.evening}</div>
        </div>
      </div>

      {/* Altitude arc */}
      <div className="text-[10px] text-slate-600 mb-1">Arco solar diario — altitud en grados</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="solGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fontSize: 7, fill: '#475569' }} interval={2} />
            <YAxis domain={[0, 90]} tick={{ fontSize: 7, fill: '#475569' }} unit="°" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              formatter={(v: unknown) => [`${v}°`, 'Altitud solar']}
            />
            <ReferenceLine y={45} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: '45°', position: 'right', fontSize: 7, fill: '#f97316' }} />
            <Area type="monotone" dataKey="alt" stroke="#fbbf24" fill="url(#solGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
