import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface SpotForecastData {
  location: string
  timezone: string
  hours: SpotHour[]
  summary: string
}

export interface SpotHour {
  time: string
  hour: string
  temp: number
  feelsLike: number
  humidity: number
  dewpoint: number
  pressure: number
  wind: number
  windDir: number
  windDirLabel: string
  gust: number
  cloud: number
  precip: number
  snowfall: number
  uvIndex: number
  visibility: number
  weatherIcon: string
  weatherDesc: string
}

function windDirLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

function feelsLike(temp: number, wind: number, humidity: number): number {
  if (temp < 10 && wind > 4.8) {
    const wc = 13.12 + 0.6215 * temp - 11.37 * Math.pow(wind, 0.16) + 0.3965 * temp * Math.pow(wind, 0.16)
    return Math.round(wc * 10) / 10
  }
  if (temp > 27) {
    const hi = -8.784695 + 1.61139411 * temp + 2.338549 * humidity - 0.14611605 * temp * humidity
      - 0.012308094 * temp * temp - 0.016424828 * humidity * humidity
      + 0.002211732 * temp * temp * humidity + 0.00072546 * temp * humidity * humidity
      - 0.000003582 * temp * temp * humidity * humidity
    return Math.round(hi * 10) / 10
  }
  return temp
}

function weatherIcon(temp: number, cloud: number, precip: number, snow: number, hour: number, uv: number): string {
  if (snow > 0.5) return '❄️'
  if (precip > 5) return '⛈️'
  if (precip > 1) return '🌧️'
  if (precip > 0) return '🌦️'
  const isDaytime = hour >= 7 && hour <= 20
  if (cloud > 75) return isDaytime ? '☁️' : '☁️'
  if (cloud > 40) return isDaytime ? '⛅' : '🌥️'
  if (isDaytime) return uv > 5 ? '☀️' : '🌤️'
  return '🌙'
}

function weatherDesc(temp: number, cloud: number, precip: number, snow: number, wind: number, uv: number): string {
  if (snow > 0.5) return 'Nevada'
  if (precip > 5) return 'Tormenta fuerte'
  if (precip > 1) return 'Lluvia'
  if (precip > 0) return 'Lluvia débil'
  if (cloud > 75) return 'Muy nublado'
  if (cloud > 40) return 'Parcialmente nublado'
  if (uv > 8) return 'Soleado, UV alto'
  return 'Soleado'
}

function summaryText(hours: SpotHour[]): string {
  const dayHours = hours.filter(h => { const hr = parseInt(h.hour); return hr >= 8 && hr <= 20 })
  if (!dayHours.length) return ''
  const maxTemp = Math.max(...dayHours.map(h => h.temp))
  const minTemp = Math.min(...hours.map(h => h.temp))
  const maxWind = Math.max(...hours.map(h => h.wind))
  const totalPrecip = hours.reduce((s, h) => s + h.precip, 0)
  const maxUV = Math.max(...dayHours.map(h => h.uvIndex))
  let s = `Máx ${maxTemp}°C, mín ${minTemp}°C.`
  if (totalPrecip > 0) s += ` Precipitación acumulada: ${Math.round(totalPrecip * 10) / 10} mm.`
  if (maxWind > 30) s += ` Viento fuerte hasta ${maxWind} km/h.`
  if (maxUV >= 8) s += ` UV elevado: ${maxUV}.`
  return s
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation,snowfall,uv_index,visibility&forecast_days=1&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: SpotHour[] = (raw.hourly?.time ?? []).slice(0, 24).map((t: string, i: number) => {
    const temp   = raw.hourly.temperature_2m?.[i] ?? 15
    const feels  = raw.hourly.apparent_temperature?.[i] ?? temp
    const rh     = raw.hourly.relative_humidity_2m?.[i] ?? 60
    const dp     = raw.hourly.dew_point_2m?.[i] ?? 10
    const pres   = raw.hourly.surface_pressure?.[i] ?? 1013
    const wind   = raw.hourly.wind_speed_10m?.[i] ?? 5
    const wdir   = raw.hourly.wind_direction_10m?.[i] ?? 0
    const gust   = raw.hourly.wind_gusts_10m?.[i] ?? wind
    const cloud  = raw.hourly.cloud_cover?.[i] ?? 30
    const precip = raw.hourly.precipitation?.[i] ?? 0
    const snow   = raw.hourly.snowfall?.[i] ?? 0
    const uv     = raw.hourly.uv_index?.[i] ?? 0
    const vis    = (raw.hourly.visibility?.[i] ?? 10000) / 1000
    const hour   = parseInt(t.slice(11, 13))
    return {
      time: t,
      hour: t.slice(11, 16),
      temp: Math.round(temp * 10) / 10,
      feelsLike: Math.round(feels * 10) / 10,
      humidity: Math.round(rh),
      dewpoint: Math.round(dp * 10) / 10,
      pressure: Math.round(pres),
      wind: Math.round(wind),
      windDir: Math.round(wdir),
      windDirLabel: windDirLabel(wdir),
      gust: Math.round(gust),
      cloud: Math.round(cloud),
      precip: Math.round(precip * 10) / 10,
      snowfall: Math.round(snow * 10) / 10,
      uvIndex: Math.round(uv * 10) / 10,
      visibility: Math.round(vis * 10) / 10,
      weatherIcon: weatherIcon(temp, cloud, precip, snow, hour, uv),
      weatherDesc: weatherDesc(temp, cloud, precip, snow, wind, uv),
    }
  })

  return NextResponse.json({
    location: `${lat}, ${lon}`,
    timezone: raw.timezone ?? 'UTC',
    hours,
    summary: summaryText(hours),
  } satisfies SpotForecastData)
}
