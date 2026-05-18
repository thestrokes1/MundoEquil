import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface PollenForecastPoint {
  time: string
  grass: number | null
  birch: number | null
  alder: number | null
  mugwort: number | null
  ragweed: number | null
  olive: number | null
}

export interface PollenForecastData {
  points: PollenForecastPoint[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', 'grass_pollen,birch_pollen,alder_pollen,mugwort_pollen,ragweed_pollen,olive_pollen')
  url.searchParams.set('forecast_days', '5')
  url.searchParams.set('timezone', 'auto')

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.hourly) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const h = json.hourly
    const points: PollenForecastPoint[] = h.time.map((t: string, i: number) => ({
      time: t,
      grass: h.grass_pollen[i],
      birch: h.birch_pollen[i],
      alder: h.alder_pollen[i],
      mugwort: h.mugwort_pollen[i],
      ragweed: h.ragweed_pollen[i],
      olive: h.olive_pollen[i],
    }))

    return NextResponse.json({ points })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
