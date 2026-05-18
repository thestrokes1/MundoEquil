import { NextRequest, NextResponse } from 'next/server'
import type { Location } from '@/types/weather'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  // Reverse geocoding from coordinates
  if (lat && lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MundoEquil/1.0 cristian.isr.vazquez@gmail.com' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return NextResponse.json({ error: 'Geocodificación fallida' }, { status: 502 })
    const raw = await res.json()
    const location: Location = {
      name: raw.address?.city ?? raw.address?.town ?? raw.address?.village ?? raw.address?.county ?? 'Ubicación',
      country: raw.address?.country_code?.toUpperCase() ?? '',
      state: raw.address?.state,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    }
    return NextResponse.json([location])
  }

  // Forward geocoding from name
  if (!q) return NextResponse.json({ error: 'q, lat o lon son requeridos' }, { status: 400 })

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', q)
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'es')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Geocodificación fallida' }, { status: 502 })

  const raw = await res.json()
  const results: Location[] = (raw.results ?? []).map((r: { name: string; country_code: string; admin1?: string; latitude: number; longitude: number }) => ({
    name: r.name,
    country: r.country_code?.toUpperCase() ?? '',
    state: r.admin1,
    lat: r.latitude,
    lon: r.longitude,
  }))

  return NextResponse.json(results)
}
