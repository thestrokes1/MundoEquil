import { NextRequest, NextResponse } from 'next/server'
import type { WeatherData } from '@/types/weather'
import { getWeatherInfo } from '@/lib/weather-codes'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const name = searchParams.get('name') ?? 'Desconocido'
  const country = searchParams.get('country') ?? ''

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat y lon son requeridos' }, { status: 400 })
  }

  const latN = parseFloat(lat)
  const lonN = parseFloat(lon)

  if (isNaN(latN) || isNaN(lonN)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latN))
  url.searchParams.set('longitude', String(lonN))
  url.searchParams.set('current', [
    'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
    'precipitation', 'weather_code', 'cloud_cover', 'surface_pressure',
    'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
    'is_day', 'dew_point_2m', 'visibility', 'uv_index',
  ].join(','))
  url.searchParams.set('hourly', [
    'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
    'precipitation_probability', 'precipitation', 'weather_code',
    'wind_speed_10m', 'is_day',
  ].join(','))
  url.searchParams.set('daily', [
    'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max',
    'precipitation_sum', 'wind_speed_10m_max', 'uv_index_max',
    'weather_code', 'sunrise', 'sunset',
  ].join(','))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '7')

  const res = await fetch(url.toString(), { next: { revalidate: 60 } })

  if (!res.ok) {
    return NextResponse.json({ error: 'Error al obtener datos del clima' }, { status: 502 })
  }

  const raw = await res.json()
  const c = raw.current
  const info = getWeatherInfo(c.weather_code)

  const data: WeatherData = {
    location: { name, country, lat: latN, lon: lonN },
    current: {
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      tempMin: raw.daily.temperature_2m_min[0],
      tempMax: raw.daily.temperature_2m_max[0],
      humidity: c.relative_humidity_2m,
      pressure: c.surface_pressure,
      visibility: c.visibility / 1000,
      windSpeed: c.wind_speed_10m,
      windDeg: c.wind_direction_10m,
      windGust: c.wind_gusts_10m,
      description: info.label,
      icon: c.is_day ? info.day : info.night,
      cloudiness: c.cloud_cover,
      dewPoint: c.dew_point_2m,
      uvIndex: c.uv_index,
      updatedAt: new Date().toISOString(),
    },
    hourly: raw.hourly.time.slice(0, 48).map((t: string, i: number) => ({
      time: t,
      temperature: raw.hourly.temperature_2m[i],
      feelsLike: raw.hourly.apparent_temperature[i],
      humidity: raw.hourly.relative_humidity_2m[i],
      precipitationProbability: raw.hourly.precipitation_probability[i],
      precipitation: raw.hourly.precipitation[i],
      windSpeed: raw.hourly.wind_speed_10m[i],
      weatherCode: raw.hourly.weather_code[i],
      isDay: raw.hourly.is_day[i] === 1,
    })),
    daily: raw.daily.time.map((t: string, i: number) => ({
      date: t,
      tempMax: raw.daily.temperature_2m_max[i],
      tempMin: raw.daily.temperature_2m_min[i],
      precipitationProbability: raw.daily.precipitation_probability_max[i],
      precipitation: raw.daily.precipitation_sum[i],
      windSpeedMax: raw.daily.wind_speed_10m_max[i],
      uvIndexMax: raw.daily.uv_index_max[i],
      weatherCode: raw.daily.weather_code[i],
      sunrise: raw.daily.sunrise[i],
      sunset: raw.daily.sunset[i],
    })),
  }

  return NextResponse.json(data)
}
