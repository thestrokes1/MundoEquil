import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface WindPoint {
  time: string
  speed: number | null
  gusts: number | null
  direction: number | null
}

export interface WindGustData {
  points: WindPoint[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m',
    past_hours: '12',
    forecast_hours: '48',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.hourly) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const points: WindPoint[] = json.hourly.time.map((t: string, i: number) => ({
      time: t,
      speed: json.hourly.wind_speed_10m[i],
      gusts: json.hourly.wind_gusts_10m[i],
      direction: json.hourly.wind_direction_10m[i],
    }))

    return NextResponse.json({ points })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
