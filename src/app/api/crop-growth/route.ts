import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface CropGrowthData {
  currentMonth: { label: string; gddCorn: number; gddWheat: number; gddSoy: number }
  season: { gddCorn: number; gddWheat: number; gddSoy: number; days: number }
  forecast: ForecastGDD[]
  crops: CropStatus[]
  soilTemp: number | null
}

export interface ForecastGDD {
  date: string
  label: string
  gddCorn: number
  gddWheat: number
  tempMax: number
  tempMin: number
}

export interface CropStatus {
  name: string
  emoji: string
  tBase: number
  accumulated: number
  stage: string
  progress: number
  target: number
}

const CROPS = [
  { name: 'Maíz', emoji: '🌽', tBase: 10, stages: [{ max: 200, label: 'Germinación' }, { max: 500, label: 'Vegetativo' }, { max: 900, label: 'Floración' }, { max: 1400, label: 'Llenado' }, { max: 1900, label: 'Madurez' }], target: 1900 },
  { name: 'Trigo', emoji: '🌾', tBase: 5, stages: [{ max: 100, label: 'Emergencia' }, { max: 300, label: 'Macollaje' }, { max: 600, label: 'Encañado' }, { max: 900, label: 'Espigazón' }, { max: 1200, label: 'Madurez' }], target: 1200 },
  { name: 'Soya', emoji: '🫘', tBase: 10, stages: [{ max: 150, label: 'Germinación' }, { max: 400, label: 'Vegetativo' }, { max: 700, label: 'Floración' }, { max: 1100, label: 'Llenado' }, { max: 1500, label: 'Madurez' }], target: 1500 },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const today = new Date()
  // Season start: Jan 1 of current year (or nearest planting season)
  const seasonStart = new Date(today.getFullYear(), 0, 1)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const [seasonRes, forecastRes] = await Promise.all([
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,soil_temperature_0_to_7cm_mean&start_date=${fmt(seasonStart)}&end_date=${fmt(today)}&timezone=auto`, { next: { revalidate } }),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`, { next: { revalidate: 3600 } }),
  ])

  if (!seasonRes.ok) return NextResponse.json({ error: 'Archive error' }, { status: 502 })
  const seasonData = await seasonRes.json()
  const forecastData = forecastRes.ok ? await forecastRes.json() : null

  function calcGDD(tmax: number, tmin: number, tBase: number): number {
    const tavg = Math.max(tBase, (Math.min(tmax, 35) + Math.max(tmin, tBase)) / 2)
    return Math.max(0, tavg - tBase)
  }

  let totalCorn = 0, totalWheat = 0, totalSoy = 0
  let monthCorn = 0, monthWheat = 0, monthSoy = 0
  let seasonDays = 0
  let soilTemps: number[] = []

  const times: string[] = seasonData.daily?.time ?? []
  times.forEach((d: string, i: number) => {
    const tmax = seasonData.daily.temperature_2m_max[i] ?? 20
    const tmin = seasonData.daily.temperature_2m_min[i] ?? 10
    totalCorn += calcGDD(tmax, tmin, 10)
    totalWheat += calcGDD(tmax, tmin, 5)
    totalSoy += calcGDD(tmax, tmin, 10)
    if (d >= fmt(monthStart)) {
      monthCorn += calcGDD(tmax, tmin, 10)
      monthWheat += calcGDD(tmax, tmin, 5)
      monthSoy += calcGDD(tmax, tmin, 10)
    }
    const st = seasonData.daily.soil_temperature_0_to_7cm_mean?.[i]
    if (st != null) soilTemps.push(st)
    seasonDays++
  })

  const soilTemp = soilTemps.length > 0 ? Math.round(soilTemps[soilTemps.length - 1] * 10) / 10 : null

  const forecast: ForecastGDD[] = forecastData ? forecastData.daily.time.map((d: string, i: number) => {
    const tmax = forecastData.daily.temperature_2m_max[i] ?? 20
    const tmin = forecastData.daily.temperature_2m_min[i] ?? 10
    return {
      date: d,
      label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      gddCorn: Math.round(calcGDD(tmax, tmin, 10) * 10) / 10,
      gddWheat: Math.round(calcGDD(tmax, tmin, 5) * 10) / 10,
      tempMax: Math.round(tmax * 10) / 10,
      tempMin: Math.round(tmin * 10) / 10,
    }
  }) : []

  function cropStatus(accumulated: number, crop: typeof CROPS[0]): CropStatus {
    const stage = crop.stages.find(s => accumulated <= s.max) ?? crop.stages[crop.stages.length - 1]
    return {
      name: crop.name,
      emoji: crop.emoji,
      tBase: crop.tBase,
      accumulated: Math.round(accumulated),
      stage: stage.label,
      progress: Math.min(100, Math.round((accumulated / crop.target) * 100)),
      target: crop.target,
    }
  }

  return NextResponse.json({
    currentMonth: {
      label: today.toLocaleDateString('es-MX', { month: 'long' }),
      gddCorn: Math.round(monthCorn),
      gddWheat: Math.round(monthWheat),
      gddSoy: Math.round(monthSoy),
    },
    season: {
      gddCorn: Math.round(totalCorn),
      gddWheat: Math.round(totalWheat),
      gddSoy: Math.round(totalSoy),
      days: seasonDays,
    },
    forecast,
    crops: [
      cropStatus(totalCorn, CROPS[0]),
      cropStatus(totalWheat, CROPS[1]),
      cropStatus(totalSoy, CROPS[2]),
    ],
    soilTemp,
  } satisfies CropGrowthData)
}
