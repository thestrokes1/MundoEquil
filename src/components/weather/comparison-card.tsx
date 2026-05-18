'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useLocationStore } from '@/stores/location-store'
import { formatTemp } from '@/lib/utils'
import { getWeatherInfo } from '@/lib/weather-codes'
import type { HistoryDay } from '@/hooks/use-weather'
import type { DailyForecast } from '@/types/weather'

interface Props {
  today: DailyForecast
  history: HistoryDay[]
}

function Delta({ current, previous, unit }: { current: number; previous: number; unit: 'celsius' | 'fahrenheit' }) {
  const diff = current - previous
  const absDiff = Math.abs(diff)
  if (absDiff < 0.5) return (
    <span className="flex items-center gap-0.5 text-slate-500 text-xs">
      <Minus className="w-3 h-3" /> Similar
    </span>
  )
  return (
    <span className={`flex items-center gap-0.5 text-xs ${diff > 0 ? 'text-red-400' : 'text-blue-400'}`}>
      {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {diff > 0 ? '+' : ''}{formatTemp(diff, unit).replace('°C', '°').replace('°F', '°')}
    </span>
  )
}

export function ComparisonCard({ today, history }: Props) {
  const { unit } = useLocationStore()
  if (history.length < 2) return null

  const yesterday = history[history.length - 1]
  const weekAgo = history.length >= 7 ? history[history.length - 7] : null
  const todayInfo = getWeatherInfo(today.weatherCode)
  const ystInfo = getWeatherInfo(yesterday.weatherCode)

  const rows = [
    {
      label: 'Ayer',
      data: yesterday,
      info: ystInfo,
    },
    ...(weekAgo ? [{
      label: 'Hace 7 días',
      data: weekAgo,
      info: getWeatherInfo(weekAgo.weatherCode),
    }] : []),
  ]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Comparación con días anteriores
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-white/5">
              <th className="text-left pb-2 font-medium w-28">Día</th>
              <th className="text-center pb-2 font-medium">Condición</th>
              <th className="text-center pb-2 font-medium">Máx</th>
              <th className="text-center pb-2 font-medium">Mín</th>
              <th className="text-center pb-2 font-medium">Lluvia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {/* Today */}
            <tr className="bg-sky-500/5">
              <td className="py-3 text-sky-400 font-semibold">Hoy</td>
              <td className="py-3 text-center">
                <span title={todayInfo.label}>{todayInfo.icon}</span>
              </td>
              <td className="py-3 text-center text-slate-200 font-mono">{formatTemp(today.tempMax, unit)}</td>
              <td className="py-3 text-center text-slate-400 font-mono">{formatTemp(today.tempMin, unit)}</td>
              <td className="py-3 text-center text-slate-400">{today.precipitationProbability}%</td>
            </tr>

            {rows.map(({ label, data, info }) => (
              <tr key={label}>
                <td className="py-3 text-slate-500">{label}</td>
                <td className="py-3 text-center">
                  <span title={info.label}>{info.icon}</span>
                </td>
                <td className="py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-slate-300 font-mono">{formatTemp(data.tempMax, unit)}</span>
                    <Delta current={today.tempMax} previous={data.tempMax} unit={unit} />
                  </div>
                </td>
                <td className="py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-slate-500 font-mono">{formatTemp(data.tempMin, unit)}</span>
                    <Delta current={today.tempMin} previous={data.tempMin} unit={unit} />
                  </div>
                </td>
                <td className="py-3 text-center text-slate-500">{data.precipitation.toFixed(1)} mm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
