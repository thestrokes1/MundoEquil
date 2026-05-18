'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Map } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ClimateZoneData } from '@/app/api/climate-zone/route'

const GROUP_LABELS: Record<string, string> = {
  A: 'Tropical',
  B: 'Árido',
  C: 'Templado',
  D: 'Continental',
  E: 'Polar',
}

export function ClimateZoneCard() {
  const location = useLocationStore((s) => s.location)
  const { data, isLoading } = useQuery<ClimateZoneData>({
    queryKey: ['climate-zone', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/climate-zone?lat=${location!.lat}&lon=${location!.lon}`)
        .then(r => r.json()),
    enabled: !!location,
    staleTime: 86_400_000,
    refetchInterval: false,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-44 bg-white/10" />
        <Skeleton className="h-20 bg-white/10 rounded-2xl" />
        <Skeleton className="h-32 bg-white/10 rounded-2xl" />
      </div>
    )
  }
  if (!data || 'error' in data) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <Map className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Zona climática Köppen</h3>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Badge */}
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg"
            style={{ backgroundColor: data.koppenColor }}
          >
            {data.koppen}
          </div>
          <div>
            <p className="text-base font-bold text-slate-100">{data.koppenLabel}</p>
            <p className="text-xs text-slate-400">{GROUP_LABELS[data.mainGroup] ?? data.mainGroup} · {data.seasonality}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{data.koppenDesc}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'T° media', value: `${data.annualTemp}°C` },
            { label: 'Precip/año', value: `${data.annualPrecip} mm` },
            { label: 'Mes húmedo', value: data.wetMonth ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-xl p-2 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-bold text-slate-200">{value}</p>
            </div>
          ))}
        </div>

        {/* Characteristics */}
        <div className="flex flex-wrap gap-1.5">
          {data.characteristics.map(c => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{c}</span>
          ))}
        </div>

        {/* Monthly precip chart */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Precipitación mensual (mm)</p>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={data.monthlyPrecip} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 8, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => [`${v} mm`, 'Precip']}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {data.monthlyPrecip.map((_, i) => (
                  <Cell key={i} fill={data.koppenColor} fillOpacity={0.6 + i * 0.02} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
