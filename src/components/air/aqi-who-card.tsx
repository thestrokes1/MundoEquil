'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useLocationStore } from '@/stores/location-store'
import type { AirQuality } from '@/types/weather'

// WHO 2021 annual guidelines (daily means as reference)
const WHO_LIMITS: Record<string, { value: number; unit: string; label: string }> = {
  pm25: { value: 15,   unit: 'µg/m³', label: 'PM2.5' },
  pm10: { value: 45,   unit: 'µg/m³', label: 'PM10'  },
  o3:   { value: 100,  unit: 'µg/m³', label: 'Ozono'  },
  no2:  { value: 25,   unit: 'µg/m³', label: 'NO₂'    },
  so2:  { value: 40,   unit: 'µg/m³', label: 'SO₂'    },
  co:   { value: 4000, unit: 'µg/m³', label: 'CO'     },
}

function pollutantColor(pct: number): string {
  if (pct <= 50)  return '#4ade80'
  if (pct <= 100) return '#facc15'
  if (pct <= 200) return '#fb923c'
  return '#f87171'
}

export function AQIWHOCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const aq = qc.getQueryData<AirQuality>(['air-quality', location?.lat, location?.lon])

  if (!location || !aq) return null

  const pollutants = [
    { key: 'pm25', value: aq.pm25 },
    { key: 'pm10', value: aq.pm10 },
    { key: 'o3',   value: aq.o3   },
    { key: 'no2',  value: aq.no2  },
    { key: 'so2',  value: aq.so2  },
    { key: 'co',   value: aq.co   },
  ]

  const overLimit = pollutants.filter(p => {
    const limit = WHO_LIMITS[p.key]
    return limit && p.value > limit.value
  })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Contaminantes vs OMS</h3>
        {overLimit.length === 0 ? (
          <span className="text-xs px-2.5 py-1 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300">Dentro de límites</span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300">
            {overLimit.length} excedido{overLimit.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {pollutants.map(({ key, value }) => {
          const limit = WHO_LIMITS[key]
          const pct = (value / limit.value) * 100
          const color = pollutantColor(pct)
          const barPct = Math.min(pct, 300)
          const exceeded = pct > 100

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{limit.label}</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-slate-500 text-[11px]">{value.toFixed(1)} {limit.unit}</span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ color, background: color + '22' }}
                  >
                    {pct.toFixed(0)}% OMS
                  </span>
                </div>
              </div>
              {/* Bar with OMS limit marker at 100% */}
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(barPct / 3, 100)}%`, backgroundColor: color }}
                />
                {/* OMS limit line at 1/3 of bar */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-white/30"
                  style={{ left: '33.33%' }}
                />
              </div>
              {exceeded && (
                <div className="text-[10px] text-red-400">
                  Excede en {(pct - 100).toFixed(0)}% la directriz OMS (≤{limit.value} {limit.unit})
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-[10px] text-slate-700">
        Directrices de calidad del aire OMS 2021. La barra se llena al 100% OMS (línea blanca = límite).
      </div>
    </div>
  )
}
