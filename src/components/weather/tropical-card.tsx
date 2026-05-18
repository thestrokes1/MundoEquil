'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import { Skeleton } from '@/components/ui/skeleton'
import type { TropicalData } from '@/app/api/tropical/route'

const CAT_CONFIG = {
  negligible: { label: 'Potencial negligible',  color: '#4ade80', icon: '🌤' },
  low:        { label: 'Potencial bajo',         color: '#a3e635', icon: '🌦' },
  moderate:   { label: 'Potencial moderado',     color: '#facc15', icon: '⛈' },
  elevated:   { label: 'Potencial elevado',      color: '#fb923c', icon: '🌀' },
  high:       { label: 'Potencial alto',         color: '#f87171', icon: '🌀' },
}

function GaugeSVG({ value, size = 90 }: { value: number; size: number }) {
  const r = size * 0.38
  const circ = Math.PI * r  // half circle
  const dash = (value / 100) * circ
  const color = value >= 70 ? '#f87171' : value >= 50 ? '#fb923c' : value >= 30 ? '#facc15' : '#4ade80'
  const cx = size / 2, cy = size * 0.65

  return (
    <svg width={size} height={size * 0.72}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#1e293b" strokeWidth={size * 0.08} />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth={size * 0.08}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="700">
        {value}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#475569" fontSize={size * 0.1}>
        /100
      </text>
    </svg>
  )
}

export function TropicalCard() {
  const location = useLocationStore(s => s.location)

  const { data, isLoading } = useQuery<TropicalData>({
    queryKey: ['tropical', location?.lat, location?.lon],
    queryFn: () => fetch(`/api/tropical?lat=${location!.lat}&lon=${location!.lon}`).then(r => r.json()),
    enabled: !!location,
    staleTime: 3_600_000,
    refetchInterval: false,
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

  const cat = CAT_CONFIG[data.category]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">🌀 Ciclones Tropicales</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border" style={{
          color: cat.color, borderColor: cat.color + '44', background: cat.color + '1a'
        }}>
          {cat.icon} {cat.label}
        </span>
      </div>

      {/* Gauge + season status */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex flex-col items-center">
          <GaugeSVG value={data.formationIndex} size={90} />
          <div className="text-[9px] text-slate-600 mt-1">Índice de ciclogenesis</div>
        </div>
        <div className="flex-1 space-y-2 text-xs mt-1">
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
            <span className="text-slate-500">Temporada activa</span>
            <span className={data.season ? 'text-amber-400 font-bold' : 'text-slate-500'}>
              {data.season ? '⚠ Sí' : '✓ No'}
            </span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
            <span className="text-slate-500">TSM del océano</span>
            <span className="font-bold" style={{ color: data.sst >= 26 ? '#f87171' : '#4ade80' }}>
              {data.sst}°C {data.sstAnomaly > 0 ? `(+${data.sstAnomaly})` : `(${data.sstAnomaly})`}
            </span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
            <span className="text-slate-500">Distancia a trópicos</span>
            <span className="text-slate-300 font-medium">+{data.distance}°</span>
          </div>
        </div>
      </div>

      {/* Alert for elevated/high */}
      {data.formationIndex >= 50 && (
        <div className="mb-4 px-3 py-2.5 rounded-xl text-xs border" style={{
          borderColor: cat.color + '33', background: cat.color + '12', color: cat.color
        }}>
          🌀 Condiciones de ciclogenesis presentes — consultar el NHC o servicio meteorológico nacional
        </div>
      )}

      {/* Parameters table */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">CAPE</div>
          <div className="font-bold text-slate-200">{data.cape}</div>
          <div className="text-[9px] text-slate-600">J/kg</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Índice de lift.</div>
          <div className="font-bold text-slate-200">{data.liftedIndex}</div>
          <div className="text-[9px] text-slate-600">K</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Cizalladura</div>
          <div className="font-bold text-slate-200">{data.shear}</div>
          <div className="text-[9px] text-slate-600">km/h</div>
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-1">
        {data.tips.map((tip, i) => (
          <div key={i} className="text-[10px] text-slate-500 flex gap-1.5 items-start">
            <span className="text-slate-600 mt-0.5">•</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[9px] text-slate-700 text-center">
        Índice basado en TSM, CAPE, LI y estación · No sustituye a avisos oficiales
      </div>
    </div>
  )
}
