'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Globe2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { CityComparisonData, CityWeather } from '@/app/api/city-comparison/route'

function TempBadge({ diff }: { diff: number }) {
  const isPos = diff > 0
  const isNeg = diff < 0
  const color = isPos ? 'text-rose-400' : isNeg ? 'text-blue-400' : 'text-slate-400'
  const sign  = isPos ? '+' : ''
  return <span className={`text-xs font-bold ${color}`}>{sign}{diff}°</span>
}

function CityRow({ city, isRef }: { city: CityWeather; isRef?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isRef ? 'bg-white/10 border border-white/20' : 'bg-white/5 hover:bg-white/8 transition-colors'}`}>
      <span className="text-xl leading-none">{city.conditionIcon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">
          {city.name}
          {city.country && <span className="text-slate-500 font-normal ml-1 text-xs">{city.country}</span>}
          {isRef && <span className="ml-1 text-[10px] bg-sky-500/30 text-sky-300 px-1.5 py-0.5 rounded-full">Tu ubicación</span>}
        </p>
        <p className="text-[11px] text-slate-400">{city.condition}</p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-sm font-bold text-slate-100">{city.temp}°C</p>
        {!isRef && <TempBadge diff={city.tempDiff} />}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 font-medium">{value}</span>
    </div>
  )
}

export function CityComparisonCard() {
  const location = useLocationStore((s) => s.location)

  const { data, isLoading } = useQuery<CityComparisonData>({
    queryKey: ['city-comparison', location?.lat, location?.lon],
    queryFn: () =>
      fetch(`/api/city-comparison?lat=${location!.lat}&lon=${location!.lon}&name=${encodeURIComponent(location!.name ?? 'Mi ubicación')}`)
        .then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <Skeleton className="h-4 w-40 bg-white/10" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 bg-white/10 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!data || 'error' in data) return null

  const { reference, cities } = data
  const warmest = [...cities].sort((a, b) => b.temp - a.temp)[0]
  const coldest = [...cities].sort((a, b) => a.temp - b.temp)[0]

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-blue-900/20 backdrop-blur-md overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-2">
        <Globe2 className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Comparación mundial</h3>
      </div>

      <div className="px-5 space-y-1.5 pb-4">
        <CityRow city={reference} isRef />
        {cities.map(c => <CityRow key={c.name} city={c} />)}
      </div>

      <div className="border-t border-white/5 px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-0.5">
        <DetailRow label="Más cálida" value={`${warmest.name} ${warmest.temp}°C`} />
        <DetailRow label="Más fría" value={`${coldest.name} ${coldest.temp}°C`} />
        <DetailRow label="Rango" value={`${((warmest.temp - coldest.temp)).toFixed(1)}°C`} />
        <DetailRow
          label="Vs. tu loc."
          value={`${cities.reduce((s, c) => s + c.tempDiff, 0) >= 0 ? '+' : ''}${(cities.reduce((s, c) => s + c.tempDiff, 0) / cities.length).toFixed(1)}° prom.`}
        />
      </div>
    </div>
  )
}
