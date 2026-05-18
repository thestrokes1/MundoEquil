import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface ExtendedDay {
  date: string
  weatherCode: number
  tempMax: number | null
  tempMin: number | null
  precipSum: number | null
  precipProbMax: number | null
  windSpeedMax: number | null
  uvIndexMax: number | null
  sunrise: string | null
  sunset: string | null
}

export interface ExtendedForecastData {
  days: ExtendedDay[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'uv_index_max',
      'sunrise',
      'sunset',
    ].join(','),
    forecast_days: '16',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.daily) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const days: ExtendedDay[] = json.daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: json.daily.weather_code[i],
      tempMax: json.daily.temperature_2m_max[i],
      tempMin: json.daily.temperature_2m_min[i],
      precipSum: json.daily.precipitation_sum[i],
      precipProbMax: json.daily.precipitation_probability_max[i],
      windSpeedMax: json.daily.wind_speed_10m_max[i],
      uvIndexMax: json.daily.uv_index_max[i],
      sunrise: json.daily.sunrise[i],
      sunset: json.daily.sunset[i],
    }))

    return NextResponse.json({ days })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
