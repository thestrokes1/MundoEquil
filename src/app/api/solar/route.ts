import { NextRequest, NextResponse } from 'next/server'

export interface SolarData {
  hourly: {
    time: string[]
    shortwaveRadiation: number[]
    directRadiation: number[]
    diffuseRadiation: number[]
    directNormalIrradiance: number[]
    sunshineDuration: number[]
    isDay: number[]
  }
  daily: {
    time: string[]
    sunshineDuration: number[]
    shortwaveRadiationSum: number[]
    directNormalIrradianceSum: number[]
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
  url.searchParams.set('hourly', 'shortwave_radiation,direct_radiation,diffuse_radiation,direct_normal_irradiance,sunshine_duration,is_day')
  url.searchParams.set('daily', 'sunshine_duration,shortwave_radiation_sum,direct_radiation_sum')
  url.searchParams.set('past_hours', '6')
  url.searchParams.set('forecast_hours', '24')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Error' }, { status: 502 })

  const raw = await res.json()
  const h = raw.hourly
  const d = raw.daily

  return NextResponse.json({
    hourly: {
      time: h.time,
      shortwaveRadiation: h.shortwave_radiation,
      directRadiation: h.direct_radiation,
      diffuseRadiation: h.diffuse_radiation,
      directNormalIrradiance: h.direct_normal_irradiance,
      sunshineDuration: h.sunshine_duration,
      isDay: h.is_day,
    },
    daily: {
      time: d.time,
      sunshineDuration: d.sunshine_duration,
      shortwaveRadiationSum: d.shortwave_radiation_sum,
      directNormalIrradianceSum: d.direct_radiation_sum,
    },
  } satisfies SolarData)
}
