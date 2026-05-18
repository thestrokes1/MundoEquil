import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface CloudPoint {
  time: string
  total: number | null
  low: number | null
  mid: number | null
  high: number | null
  isDay: number | null
  radiation: number | null
}

export interface CloudCoverData {
  points: CloudPoint[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,shortwave_radiation,is_day',
    past_hours: '6',
    forecast_hours: '48',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.hourly) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const points: CloudPoint[] = json.hourly.time.map((t: string, i: number) => ({
      time: t,
      total: json.hourly.cloud_cover[i],
      low: json.hourly.cloud_cover_low[i],
      mid: json.hourly.cloud_cover_mid[i],
      high: json.hourly.cloud_cover_high[i],
      isDay: json.hourly.is_day[i],
      radiation: json.hourly.shortwave_radiation[i],
    }))

    return NextResponse.json({ points })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
