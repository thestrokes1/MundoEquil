import { NextRequest, NextResponse } from 'next/server'

export interface ExtendedHourlyPoint {
  time: string
  temperature: number
  precipitationProbability: number
  weatherCode: number
  isDay: boolean
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code,is_day')
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error' }, { status: 502 })

  const raw = await res.json()
  const h = raw.hourly

  const points: ExtendedHourlyPoint[] = h.time.map((t: string, i: number) => ({
    time: t,
    temperature: h.temperature_2m[i],
    precipitationProbability: h.precipitation_probability[i] ?? 0,
    weatherCode: h.weather_code[i],
    isDay: h.is_day[i] === 1,
  }))

  return NextResponse.json(points)
}
