import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface RenewableHour {
  time: string
  solarRadiation: number | null
  directNormal: number | null
  wind10m: number | null
  wind100m: number | null
}

export interface RenewableDay {
  date: string
  solarSum: number | null   // kWh/m²/day (radiation sum / 1000)
  windAvg10m: number | null // average km/h
  windAvg100m: number | null
}

export interface RenewableData {
  hourly: RenewableHour[]
  daily: RenewableDay[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'shortwave_radiation,direct_normal_irradiance,wind_speed_10m,wind_speed_100m',
    daily: 'shortwave_radiation_sum,wind_speed_10m_max,wind_speed_100m_max',
    forecast_days: '7',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.hourly || !json.daily) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const hourly: RenewableHour[] = json.hourly.time.map((t: string, i: number) => ({
      time: t,
      solarRadiation: json.hourly.shortwave_radiation[i],
      directNormal: json.hourly.direct_normal_irradiance[i],
      wind10m: json.hourly.wind_speed_10m[i],
      wind100m: json.hourly.wind_speed_100m[i],
    }))

    const daily: RenewableDay[] = json.daily.time.map((date: string, i: number) => ({
      date,
      solarSum: json.daily.shortwave_radiation_sum[i],
      windAvg10m: json.daily.wind_speed_10m_max[i],
      windAvg100m: json.daily.wind_speed_100m_max[i],
    }))

    return NextResponse.json({ hourly, daily })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
