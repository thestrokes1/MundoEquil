import { NextRequest, NextResponse } from 'next/server'

export interface LightningData {
  hourly: {
    time: string[]
    lightningPotential: (number | null)[]
    cape: (number | null)[]
    liftedIndex: (number | null)[]
    convectivePrecipitation: (number | null)[]
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', 'lightning_potential,cape,lifted_index,precipitation_probability')
  url.searchParams.set('past_hours', '6')
  url.searchParams.set('forecast_hours', '48')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error' }, { status: 502 })

  const raw = await res.json()
  const h = raw.hourly

  return NextResponse.json({
    hourly: {
      time: h.time,
      lightningPotential: h.lightning_potential,
      cape: h.cape,
      liftedIndex: h.lifted_index,
      convectivePrecipitation: h.precipitation_probability,
    },
  } satisfies LightningData)
}
