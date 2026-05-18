import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface ETData {
  today: ETDay
  days: ETDay[]
  monthlyET0: number
  monthlyPrecip: number
  waterBalance: number
  cropFactors: CropET[]
}

export interface ETDay {
  date: string
  label: string
  et0: number
  sunshine: number
  tempMax: number
  tempMin: number
  windSpeed: number
  humidity: number
  precip: number
  netWater: number
}

export interface CropET {
  name: string
  emoji: string
  kc: number
  etc: number
  needsMm: number
  waterStress: boolean
}

const CROPS = [
  { name: 'Maíz (floración)', emoji: '🌽', kc: 1.20 },
  { name: 'Trigo (encañado)', emoji: '🌾', kc: 1.15 },
  { name: 'Tomate (medio)',   emoji: '🍅', kc: 1.15 },
  { name: 'Pasto / césped',   emoji: '🌿', kc: 1.00 },
  { name: 'Árboles frutales', emoji: '🍎', kc: 0.85 },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const today = new Date()
  const d30 = new Date(today)
  d30.setDate(d30.getDate() - 30)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const [forecastRes, archiveRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=et0_fao_evapotranspiration,precipitation_sum,sunshine_duration,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,relative_humidity_2m_mean&forecast_days=7&timezone=auto`, { next: { revalidate } }),
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=et0_fao_evapotranspiration,precipitation_sum&start_date=${fmt(d30)}&end_date=${fmt(today)}&timezone=auto`, { next: { revalidate: 86400 } }),
  ])

  if (!forecastRes.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const forecast = await forecastRes.json()
  const archive = archiveRes.ok ? await archiveRes.json() : null

  const days: ETDay[] = forecast.daily.time.map((d: string, i: number) => {
    const et0 = forecast.daily.et0_fao_evapotranspiration?.[i] ?? 0
    const precip = forecast.daily.precipitation_sum?.[i] ?? 0
    const sunH = (forecast.daily.sunshine_duration?.[i] ?? 0) / 3600
    const tmax = forecast.daily.temperature_2m_max?.[i] ?? 20
    const tmin = forecast.daily.temperature_2m_min?.[i] ?? 10
    const wind = forecast.daily.wind_speed_10m_max?.[i] ?? 5
    const rh = forecast.daily.relative_humidity_2m_mean?.[i] ?? 60
    return {
      date: d,
      label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      et0: Math.round(et0 * 10) / 10,
      sunshine: Math.round(sunH * 10) / 10,
      tempMax: Math.round(tmax * 10) / 10,
      tempMin: Math.round(tmin * 10) / 10,
      windSpeed: Math.round(wind),
      humidity: Math.round(rh),
      precip: Math.round(precip * 10) / 10,
      netWater: Math.round((precip - et0) * 10) / 10,
    }
  })

  // Monthly totals from archive
  let monthlyET0 = 0
  let monthlyPrecip = 0
  if (archive?.daily?.time) {
    archive.daily.time.forEach((_: string, i: number) => {
      monthlyET0 += archive.daily.et0_fao_evapotranspiration?.[i] ?? 0
      monthlyPrecip += archive.daily.precipitation_sum?.[i] ?? 0
    })
  }

  const todayET0 = days[0]?.et0 ?? 2
  const cropFactors: CropET[] = CROPS.map(c => {
    const etc = Math.round(c.kc * todayET0 * 10) / 10
    return {
      name: c.name,
      emoji: c.emoji,
      kc: c.kc,
      etc,
      needsMm: etc,
      waterStress: (days[0]?.precip ?? 0) < etc * 0.5,
    }
  })

  return NextResponse.json({
    today: days[0],
    days,
    monthlyET0: Math.round(monthlyET0 * 10) / 10,
    monthlyPrecip: Math.round(monthlyPrecip * 10) / 10,
    waterBalance: Math.round((monthlyPrecip - monthlyET0) * 10) / 10,
    cropFactors,
  } satisfies ETData)
}
