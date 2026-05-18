'use client'
import { useQueryClient } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useLocationStore } from '@/stores/location-store'
import type { WeatherData } from '@/types/weather'
import { getWeatherInfo } from '@/lib/weather-codes'

function tempColor(t: number): string {
  if (t < 0) return '#93c5fd'
  if (t < 10) return '#67e8f9'
  if (t < 20) return '#4ade80'
  if (t < 28) return '#facc15'
  if (t < 35) return '#fb923c'
  return '#f87171'
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-0.5">{time}</div>
      <div className="text-amber-300">{payload[0].value.toFixed(1)}°C</div>
    </div>
  )
}

export function TomorrowCard() {
  const location = useLocationStore(s => s.location)
  const qc = useQueryClient()
  const weather = qc.getQueryData<WeatherData>(['weather', location?.lat, location?.lon])

  if (!location || !weather || weather.daily.length < 2) return null

  const tomorrow = weather.daily[1]
  const { icon, label } = getWeatherInfo(tomorrow.weatherCode)

  const now = new Date()
  const tomorrowStr = weather.daily[1].date

  // Get tomorrow's hourly data
  const tomorrowHours = weather.hourly.filter(h => h.time.startsWith(tomorrowStr))

  const chartData = tomorrowHours
    .filter((_, i) => i % 2 === 0)  // every 2h
    .map(h => ({
      time: h.time,
      temp: h.temperature,
    }))

  const formatTime = (iso: string | null): string => {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  const tomorrowDate = new Date(tomorrowStr + 'T12:00:00')
  const dateLabel = tomorrowDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  // Find peak hour (hottest hour)
  const peakHour = tomorrowHours.reduce((best, h) => h.temperature > best.temperature ? h : best, tomorrowHours[0])
  const coolestHour = tomorrowHours.reduce((best, h) => h.temperature < best.temperature ? h : best, tomorrowHours[0])

  const maxTemp = tomorrow.tempMax
  const minTemp = tomorrow.tempMin
  const rainProb = tomorrow.precipitationProbability
  const wind = tomorrow.windSpeedMax
  const uv = tomorrow.uvIndexMax

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Mañana</h3>
        {rainProb > 40 && (
          <span className="text-xs px-2.5 py-1 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300">
            💧 {rainProb}% lluvia
          </span>
        )}
      </div>
      <div className="text-xs text-slate-500 mb-4 capitalize">{dateLabel}</div>

      {/* Hero */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-5xl">{icon}</span>
        <div>
          <div className="text-slate-300 text-sm font-medium">{label}</div>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-3xl font-bold" style={{ color: tempColor(maxTemp) }}>{Math.round(maxTemp)}°</span>
            <span className="text-lg text-slate-500 mb-0.5">/ {Math.round(minTemp)}°C</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
        <div className="bg-white/5 rounded-2xl p-2 text-center">
          <div className="text-slate-500 text-[10px]">Amanecer</div>
          <div className="text-amber-300 font-medium">{formatTime(tomorrow.sunrise)}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-2 text-center">
          <div className="text-slate-500 text-[10px]">Atardecer</div>
          <div className="text-orange-400 font-medium">{formatTime(tomorrow.sunset)}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-2 text-center">
          <div className="text-slate-500 text-[10px]">Viento</div>
          <div className="text-slate-300 font-medium">{Math.round(wind)} km/h</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-2 text-center">
          <div className="text-slate-500 text-[10px]">UV máx</div>
          <div className="text-yellow-400 font-medium">{uv.toFixed(1)}</div>
        </div>
      </div>

      {/* Peak/Coolest hour */}
      {tomorrowHours.length > 0 && (
        <div className="flex gap-2 mb-4 text-xs">
          <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
            <div className="text-orange-300 text-[10px] mb-0.5">Hora más calurosa</div>
            <div className="text-orange-300 font-semibold">{new Date(peakHour.time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="flex-1 bg-sky-500/10 border border-sky-500/20 rounded-xl p-2.5 text-center">
            <div className="text-sky-300 text-[10px] mb-0.5">Hora más fresca</div>
            <div className="text-sky-300 font-semibold">{new Date(coolestHour.time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      )}

      {/* Temperature chart for tomorrow */}
      {chartData.length > 0 && (
        <>
          <div className="text-[10px] text-slate-600 mb-1">Temperatura horaria mañana</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <XAxis
                  dataKey="time"
                  tickFormatter={t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={2}
                />
                <YAxis
                  domain={[Math.floor(minTemp) - 1, Math.ceil(maxTemp) + 1]}
                  tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${v}°`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="temp" radius={[3, 3, 0, 0]} maxBarSize={18}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={tempColor(entry.temp)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
