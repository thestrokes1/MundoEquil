import { NextRequest, NextResponse } from 'next/server'

export interface PressurePoint {
  time: string
  pressure: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', 'surface_pressure')
  url.searchParams.set('past_hours', '24')
  url.searchParams.set('forecast_hours', '24')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error' }, { status: 502 })

  const raw = await res.json()
  const points: PressurePoint[] = raw.hourly.time.map((t: string, i: number) => ({
    time: t,
    pressure: raw.hourly.surface_pressure[i],
  })).filter((p: PressurePoint) => p.pressure !== null)

  return NextResponse.json(points)
}
