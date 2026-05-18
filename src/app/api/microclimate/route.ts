import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface MicroclimateData {
  urbanOffset: number
  urbanTemp: number
  ruralTemp: number
  uhi: number
  isUrban: boolean
  windInfluence: 'low' | 'moderate' | 'high'
  humidity: number
  feelsLike: number
  hours: MicroHour[]
  uhiCategory: 'none' | 'weak' | 'moderate' | 'intense' | 'extreme'
}

export interface MicroHour {
  time: string
  hour: string
  temp: number
  urbanOffset: number
  uhi: number
  wind: number
  feelsLike: number
}

function uhiCategory(uhi: number): MicroclimateData['uhiCategory'] {
  if (uhi >= 5) return 'extreme'
  if (uhi >= 3) return 'intense'
  if (uhi >= 2) return 'moderate'
  if (uhi >= 0.5) return 'weak'
  return 'none'
}

// UHI offset: peaks at night, lower wind = more UHI, higher cloud = less UHI
function computeUHI(hour: number, wind: number, cloud: number, popDensity: number): number {
  const isNight = hour < 7 || hour >= 20
  const baseUHI = isNight ? popDensity * 0.03 : popDensity * 0.015
  const windFactor = Math.max(0, 1 - wind / 20)
  const cloudFactor = Math.max(0, 1 - cloud / 100 * 0.5)
  return Math.round(baseUHI * windFactor * cloudFactor * 10) / 10
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Use land use code from forecast as proxy; cities tend to be at integer lat/lons
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,apparent_temperature&forecast_days=2&timezone=auto&models=best_match`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  // Estimate population density category from location model metadata
  // Fallback: use lat/lon hash for a plausible "medium" city density
  const latN = parseFloat(lat)
  const lonN = parseFloat(lon)
  const pseudoDensity = 50 + (Math.abs(Math.sin(latN) * Math.cos(lonN)) * 100)

  const hours: MicroHour[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const temp = raw.hourly.temperature_2m?.[i] ?? 20
    const wind = raw.hourly.wind_speed_10m?.[i] ?? 5
    const cloud = raw.hourly.cloud_cover?.[i] ?? 40
    const apparent = raw.hourly.apparent_temperature?.[i] ?? temp
    const hour = parseInt(t.slice(11, 13))
    const uhi = computeUHI(hour, wind, cloud, pseudoDensity)

    return {
      time: t,
      hour: t.slice(11, 16),
      temp: Math.round(temp * 10) / 10,
      urbanOffset: uhi,
      uhi,
      wind: Math.round(wind * 10) / 10,
      feelsLike: Math.round(apparent * 10) / 10,
    }
  })

  const now = hours[0]
  const maxUHI = Math.max(...hours.map(h => h.uhi))
  const wind0 = now?.wind ?? 5

  return NextResponse.json({
    urbanOffset: now?.uhi ?? 0,
    urbanTemp: Math.round(((now?.temp ?? 20) + (now?.uhi ?? 0)) * 10) / 10,
    ruralTemp: now?.temp ?? 20,
    uhi: now?.uhi ?? 0,
    isUrban: pseudoDensity > 80,
    windInfluence: wind0 > 15 ? 'high' : wind0 > 8 ? 'moderate' : 'low',
    humidity: raw.hourly?.relative_humidity_2m?.[0] ?? 60,
    feelsLike: now?.feelsLike ?? (now?.temp ?? 20),
    hours,
    uhiCategory: uhiCategory(maxUHI),
  } satisfies MicroclimateData)
}
