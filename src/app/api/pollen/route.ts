import { NextRequest, NextResponse } from 'next/server'

export interface PollenData {
  current: {
    grassPollen: number | null
    birchPollen: number | null
    alderPollen: number | null
    mugwortPollen: number | null
    ragweedPollen: number | null
    olivePollen: number | null
  }
  hourly: {
    time: string[]
    grassPollen: (number | null)[]
    birchPollen: (number | null)[]
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('current', 'grass_pollen,birch_pollen,alder_pollen,mugwort_pollen,ragweed_pollen,olive_pollen')
  url.searchParams.set('hourly', 'grass_pollen,birch_pollen')
  url.searchParams.set('forecast_days', '3')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error' }, { status: 502 })

  const raw = await res.json()
  const c = raw.current ?? {}
  const h = raw.hourly ?? {}

  return NextResponse.json({
    current: {
      grassPollen: c.grass_pollen ?? null,
      birchPollen: c.birch_pollen ?? null,
      alderPollen: c.alder_pollen ?? null,
      mugwortPollen: c.mugwort_pollen ?? null,
      ragweedPollen: c.ragweed_pollen ?? null,
      olivePollen: c.olive_pollen ?? null,
    },
    hourly: {
      time: h.time ?? [],
      grassPollen: h.grass_pollen ?? [],
      birchPollen: h.birch_pollen ?? [],
    },
  } satisfies PollenData)
}
