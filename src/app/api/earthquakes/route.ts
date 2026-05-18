import { NextRequest, NextResponse } from 'next/server'
import type { Earthquake } from '@/types/weather'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const minMag = searchParams.get('minMag') ?? '2.5'
  const hours = searchParams.get('hours') ?? '24'

  const endTime = new Date().toISOString()
  const startTime = new Date(Date.now() - parseInt(hours) * 3600 * 1000).toISOString()

  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query')
  url.searchParams.set('format', 'geojson')
  url.searchParams.set('starttime', startTime)
  url.searchParams.set('endtime', endTime)
  url.searchParams.set('minmagnitude', minMag)
  url.searchParams.set('orderby', 'time')
  url.searchParams.set('limit', '50')

  const res = await fetch(url.toString(), { next: { revalidate: 120 } })
  if (!res.ok) return NextResponse.json({ error: 'Error al obtener datos de sismos' }, { status: 502 })

  const raw = await res.json()
  const earthquakes: Earthquake[] = raw.features.map((f: {
    id: string
    properties: { mag: number; place: string; time: number; url: string }
    geometry: { coordinates: [number, number, number] }
  }) => ({
    id: f.id,
    magnitude: f.properties.mag,
    place: f.properties.place,
    time: new Date(f.properties.time).toISOString(),
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    depth: f.geometry.coordinates[2],
    url: f.properties.url,
  }))

  return NextResponse.json(earthquakes)
}
