import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface PrecipHour {
  time: string
  precipTotal: number | null
  rain: number | null
  showers: number | null
  snowfall: number | null   // cm
  snowDepth: number | null  // m
  freezingLevel: number | null
  temp: number | null
}

export interface PrecipTypeData {
  points: PrecipHour[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'precipitation,rain,showers,snowfall,snow_depth,freezing_level_height,temperature_2m',
    past_hours: '6',
    forecast_hours: '72',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.hourly) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const points: PrecipHour[] = json.hourly.time.map((t: string, i: number) => ({
      time: t,
      precipTotal: json.hourly.precipitation[i],
      rain: json.hourly.rain[i],
      showers: json.hourly.showers[i],
      snowfall: json.hourly.snowfall[i],
      snowDepth: json.hourly.snow_depth[i],
      freezingLevel: json.hourly.freezing_level_height[i],
      temp: json.hourly.temperature_2m[i],
    }))

    return NextResponse.json({ points })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
