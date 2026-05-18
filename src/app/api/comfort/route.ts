import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface ComfortPoint {
  time: string
  temp: number | null
  apparentTemp: number | null
  dewPoint: number | null
  humidity: number | null
  windSpeed: number | null
}

export interface ComfortData {
  points: ComfortPoint[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'temperature_2m,apparent_temperature,dew_point_2m,relative_humidity_2m,wind_speed_10m',
    past_hours: '6',
    forecast_hours: '48',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.hourly) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const points: ComfortPoint[] = json.hourly.time.map((t: string, i: number) => ({
      time: t,
      temp: json.hourly.temperature_2m[i],
      apparentTemp: json.hourly.apparent_temperature[i],
      dewPoint: json.hourly.dew_point_2m[i],
      humidity: json.hourly.relative_humidity_2m[i],
      windSpeed: json.hourly.wind_speed_10m[i],
    }))

    return NextResponse.json({ points })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
