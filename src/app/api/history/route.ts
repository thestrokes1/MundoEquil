import { NextRequest, NextResponse } from 'next/server'

export interface HistoryDay {
  date: string
  tempMax: number
  tempMin: number
  precipitation: number
  weatherCode: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat y lon son requeridos' }, { status: 400 })
  }

  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 1)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 13)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('start_date', fmt(startDate))
  url.searchParams.set('end_date', fmt(endDate))
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error al obtener historial' }, { status: 502 })

  const raw = await res.json()
  const days: HistoryDay[] = raw.daily.time.map((t: string, i: number) => ({
    date: t,
    tempMax: raw.daily.temperature_2m_max[i],
    tempMin: raw.daily.temperature_2m_min[i],
    precipitation: raw.daily.precipitation_sum[i] ?? 0,
    weatherCode: raw.daily.weather_code[i],
  }))

  return NextResponse.json(days)
}
