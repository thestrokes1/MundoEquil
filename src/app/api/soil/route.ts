import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface SoilPoint {
  time: string
  soilMoist0: number   // 0-1 cm
  soilMoist1: number   // 1-3 cm
  soilMoist9: number   // 9-27 cm
  soilTemp0: number    // surface
  soilTemp6: number    // 6 cm
  evapotranspiration: number
}

export interface SoilData {
  points: SoilPoint[]
  avgMoist0: number
  avgMoist9: number
  droughtRisk: 'none' | 'low' | 'moderate' | 'severe' | 'extreme'
  droughtScore: number  // 0–100
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', [
    'soil_moisture_0_to_1cm',
    'soil_moisture_1_to_3cm',
    'soil_moisture_9_to_27cm',
    'soil_temperature_0cm',
    'soil_temperature_6cm',
    'et0_fao_evapotranspiration',
  ].join(','))
  url.searchParams.set('past_days', '3')
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const times: string[] = json.hourly?.time ?? []
  const sm0: number[] = json.hourly?.soil_moisture_0_to_1cm ?? []
  const sm1: number[] = json.hourly?.soil_moisture_1_to_3cm ?? []
  const sm9: number[] = json.hourly?.soil_moisture_9_to_27cm ?? []
  const st0: number[] = json.hourly?.soil_temperature_0cm ?? []
  const st6: number[] = json.hourly?.soil_temperature_6cm ?? []
  const et: number[] = json.hourly?.et0_fao_evapotranspiration ?? []

  // Sample every 6 hours for the chart
  const points: SoilPoint[] = times
    .map((t, i) => ({
      time: t,
      soilMoist0: sm0[i] ?? 0,
      soilMoist1: sm1[i] ?? 0,
      soilMoist9: sm9[i] ?? 0,
      soilTemp0: st0[i] ?? 0,
      soilTemp6: st6[i] ?? 0,
      evapotranspiration: et[i] ?? 0,
    }))
    .filter((_, i) => i % 6 === 0)

  // Current values = first future hour (index 3*24 = 72 past hours)
  const futureIdx = 3 * 24
  const currentMoist0 = sm0[futureIdx] ?? sm0[sm0.length - 1] ?? 0
  const currentMoist9 = sm9[futureIdx] ?? sm9[sm9.length - 1] ?? 0

  // Drought score: soil moisture 0-1cm is a fraction (0–1)
  // Wilting point ~0.10, field capacity ~0.30, saturation ~0.45
  // Drought = low moisture. Score: 0 = good moisture, 100 = extreme drought
  const fieldCap = 0.30
  const wiltPt = 0.10
  const norm = Math.max(0, Math.min(1, (currentMoist0 - wiltPt) / (fieldCap - wiltPt)))
  const droughtScore = Math.round((1 - norm) * 100)

  let droughtRisk: SoilData['droughtRisk'] = 'none'
  if (droughtScore >= 80) droughtRisk = 'extreme'
  else if (droughtScore >= 60) droughtRisk = 'severe'
  else if (droughtScore >= 40) droughtRisk = 'moderate'
  else if (droughtScore >= 20) droughtRisk = 'low'

  const avgMoist0 = sm0.slice(futureIdx, futureIdx + 24).reduce((a, b) => a + b, 0) / 24
  const avgMoist9 = sm9.slice(futureIdx, futureIdx + 24).reduce((a, b) => a + b, 0) / 24

  return NextResponse.json({
    points,
    avgMoist0: parseFloat(avgMoist0.toFixed(3)),
    avgMoist9: parseFloat(avgMoist9.toFixed(3)),
    droughtRisk,
    droughtScore,
  } satisfies SoilData)
}
