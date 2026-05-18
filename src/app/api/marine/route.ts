import { NextRequest, NextResponse } from 'next/server'

export interface MarineData {
  current: {
    waveHeight: number | null
    waveDirection: number | null
    wavePeriod: number | null
    windWaveHeight: number | null
    swellWaveHeight: number | null
    swellWaveDirection: number | null
    swellWavePeriod: number | null
    oceanCurrentVelocity: number | null
    oceanCurrentDirection: number | null
    seaSurfaceTemperature: number | null
  }
  hourly: {
    time: string[]
    waveHeight: (number | null)[]
    wavePeriod: (number | null)[]
    seaSurfaceTemperature: (number | null)[]
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const url = new URL('https://marine-api.open-meteo.com/v1/marine')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('current', [
    'wave_height',
    'wave_direction',
    'wave_period',
    'wind_wave_height',
    'swell_wave_height',
    'swell_wave_direction',
    'swell_wave_period',
    'ocean_current_velocity',
    'ocean_current_direction',
    'sea_surface_temperature',
  ].join(','))
  url.searchParams.set('hourly', 'wave_height,wave_period,sea_surface_temperature')
  url.searchParams.set('forecast_hours', '48')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'No marine data' }, { status: 502 })

  const raw = await res.json()
  const c = raw.current ?? {}
  const h = raw.hourly ?? {}

  const data: MarineData = {
    current: {
      waveHeight: c.wave_height ?? null,
      waveDirection: c.wave_direction ?? null,
      wavePeriod: c.wave_period ?? null,
      windWaveHeight: c.wind_wave_height ?? null,
      swellWaveHeight: c.swell_wave_height ?? null,
      swellWaveDirection: c.swell_wave_direction ?? null,
      swellWavePeriod: c.swell_wave_period ?? null,
      oceanCurrentVelocity: c.ocean_current_velocity ?? null,
      oceanCurrentDirection: c.ocean_current_direction ?? null,
      seaSurfaceTemperature: c.sea_surface_temperature ?? null,
    },
    hourly: {
      time: h.time ?? [],
      waveHeight: h.wave_height ?? [],
      wavePeriod: h.wave_period ?? [],
      seaSurfaceTemperature: h.sea_surface_temperature ?? [],
    },
  }

  return NextResponse.json(data)
}
