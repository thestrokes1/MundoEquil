import { NextRequest, NextResponse } from 'next/server'

export interface AQIForecastPoint {
  time: string
  europeanAQI: number | null
  pm25: number | null
  pm10: number | null
  ozone: number | null
  no2: number | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', 'european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide')
  url.searchParams.set('past_hours', '24')
  url.searchParams.set('forecast_hours', '72')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error' }, { status: 502 })

  const raw = await res.json()
  const h = raw.hourly

  const points: AQIForecastPoint[] = h.time.map((t: string, i: number) => ({
    time: t,
    europeanAQI: h.european_aqi[i] ?? null,
    pm25: h.pm2_5[i] ?? null,
    pm10: h.pm10[i] ?? null,
    ozone: h.ozone[i] ?? null,
    no2: h.nitrogen_dioxide[i] ?? null,
  }))

  return NextResponse.json(points)
}
