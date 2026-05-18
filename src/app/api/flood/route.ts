import { NextRequest, NextResponse } from 'next/server'

export interface FloodData {
  daily: {
    time: string[]
    riverDischarge: (number | null)[]
    riverDischargeMax: (number | null)[]
    riverDischargeMin: (number | null)[]
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const url = new URL('https://flood-api.open-meteo.com/v1/flood')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('daily', 'river_discharge,river_discharge_max,river_discharge_min')
  url.searchParams.set('forecast_days', '16')
  url.searchParams.set('ensemble', 'true')

  const res = await fetch(url.toString(), { next: { revalidate: 21600 } })
  if (!res.ok) return NextResponse.json({ error: 'No flood data' }, { status: 502 })

  const raw = await res.json()
  const d = raw.daily ?? {}

  return NextResponse.json({
    daily: {
      time: d.time ?? [],
      riverDischarge: d.river_discharge ?? [],
      riverDischargeMax: d.river_discharge_max ?? [],
      riverDischargeMin: d.river_discharge_min ?? [],
    },
  } satisfies FloodData)
}
