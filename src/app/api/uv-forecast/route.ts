import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface UVHour {
  time: string
  uv: number | null
  clearSkyUV: number | null
  isDay: number | null
}

export interface UVForecastData {
  hours: UVHour[]
  maxToday: number | null
  maxTomorrow: number | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'uv_index,uv_index_clear_sky,is_day',
    daily: 'uv_index_max',
    forecast_days: '7',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.hourly) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const hours: UVHour[] = json.hourly.time.map((t: string, i: number) => ({
      time: t,
      uv: json.hourly.uv_index[i],
      clearSkyUV: json.hourly.uv_index_clear_sky[i],
      isDay: json.hourly.is_day[i],
    }))

    return NextResponse.json({
      hours,
      maxToday: json.daily?.uv_index_max?.[0] ?? null,
      maxTomorrow: json.daily?.uv_index_max?.[1] ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
