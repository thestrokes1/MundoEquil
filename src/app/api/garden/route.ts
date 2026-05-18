import { NextRequest, NextResponse } from 'next/server'

export interface GardenData {
  daily: {
    time: string[]
    tempMax: (number | null)[]
    tempMin: (number | null)[]
    precipSum: (number | null)[]
    precipProbMax: (number | null)[]
    windMax: (number | null)[]
    uvMax: (number | null)[]
    et0: (number | null)[]
    soilTemp: (number | null)[]
  }
  scores: number[]
  wateringNeed: 'no' | 'light' | 'moderate' | 'high'
  nextRainDay: string | null
  frostDays: string[]
  fungalRiskDays: string[]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const daily = [
    'temperature_2m_max', 'temperature_2m_min',
    'precipitation_sum', 'precipitation_probability_max',
    'wind_speed_10m_max', 'uv_index_max',
    'et0_fao_evapotranspiration', 'soil_temperature_0cm',
    'relative_humidity_2m_max',
  ].join(',')

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=${daily}&timezone=auto&forecast_days=10`

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('open-meteo error')
    const json = await res.json()
    const d = json.daily

    const scores = (d.time as string[]).map((_: string, i: number) => {
      const tMax = d.temperature_2m_max[i] ?? 20
      const tMin = d.temperature_2m_min[i] ?? 10
      const rain = d.precipitation_sum[i] ?? 0
      const rainProb = d.precipitation_probability_max[i] ?? 0
      const wind = d.wind_speed_10m_max[i] ?? 0
      const uv = d.uv_index_max[i] ?? 3
      let score = 100
      if (tMax > 38) score -= 35
      else if (tMax > 33) score -= 18
      else if (tMax < 5) score -= 40
      else if (tMax < 10) score -= 20
      if (rain > 15) score -= 28
      else if (rain > 7) score -= 16
      else if (rainProb > 75) score -= 10
      if (wind > 45) score -= 22
      else if (wind > 28) score -= 12
      if (uv > 10) score -= 10
      if (tMin < 0) score -= 32
      else if (tMin < 2) score -= 16
      return Math.max(0, Math.min(100, score))
    })

    const et0Today = d.et0_fao_evapotranspiration[0] ?? 3
    const rainToday = d.precipitation_sum[0] ?? 0
    const balance = rainToday - et0Today
    const wateringNeed: GardenData['wateringNeed'] =
      balance < -6 ? 'high' : balance < -3 ? 'moderate' : balance < 0 ? 'light' : 'no'

    const nextRainDay =
      (d.time as string[]).find((_: string, i: number) =>
        i > 0 && (d.precipitation_probability_max[i] ?? 0) > 60
      ) ?? null

    const frostDays = (d.time as string[]).filter((_: string, i: number) =>
      (d.temperature_2m_min[i] ?? 5) < 2
    )

    const fungalRiskDays = (d.time as string[]).filter((_: string, i: number) =>
      (d.relative_humidity_2m_max[i] ?? 50) > 82 && (d.temperature_2m_max[i] ?? 20) > 14
    )

    return NextResponse.json({
      daily: {
        time: d.time,
        tempMax: d.temperature_2m_max,
        tempMin: d.temperature_2m_min,
        precipSum: d.precipitation_sum,
        precipProbMax: d.precipitation_probability_max,
        windMax: d.wind_speed_10m_max,
        uvMax: d.uv_index_max,
        et0: d.et0_fao_evapotranspiration,
        soilTemp: d.soil_temperature_0cm,
      },
      scores,
      wateringNeed,
      nextRainDay,
      frostDays,
      fungalRiskDays,
    } satisfies GardenData)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch garden data' }, { status: 500 })
  }
}
