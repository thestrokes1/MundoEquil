import { NextRequest, NextResponse } from 'next/server'
import type { AirQuality } from '@/types/weather'
import { pm25ToAQI, getAQIInfo } from '@/lib/aqi'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat y lon son requeridos' }, { status: 400 })
  }

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('current', [
    'pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide',
    'sulphur_dioxide', 'ozone', 'european_aqi',
  ].join(','))
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 300 } })

  if (!res.ok) {
    return NextResponse.json({ error: 'Error al obtener calidad del aire' }, { status: 502 })
  }

  const raw = await res.json()
  const c = raw.current
  const aqiValue = c.european_aqi ?? pm25ToAQI(c.pm2_5 ?? 0)
  const info = getAQIInfo(aqiValue)

  const data: AirQuality = {
    aqi: aqiValue,
    category: info.category,
    pm25: c.pm2_5 ?? 0,
    pm10: c.pm10 ?? 0,
    o3: c.ozone ?? 0,
    no2: c.nitrogen_dioxide ?? 0,
    co: (c.carbon_monoxide ?? 0) / 1000,
    so2: c.sulphur_dioxide ?? 0,
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(data)
}
