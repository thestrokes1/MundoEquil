import { NextResponse } from 'next/server'

export const revalidate = 3600

export type FireRiskLevel = 'bajo' | 'moderado' | 'alto' | 'muy_alto' | 'extremo'

export interface FireHour {
  time: string
  temp: number | null
  humidity: number | null
  windSpeed: number | null
  precipProb: number | null
  fireIndex: number
}

export interface FireWeatherData {
  current: FireHour
  forecast: FireHour[]
  riskLevel: FireRiskLevel
  riskScore: number
}

function calcFireIndex(temp: number | null, humidity: number | null, wind: number | null, precipProb: number | null): number {
  if (temp === null || humidity === null || wind === null) return 0
  // Temperature component (0–30): temps above 15°C contribute
  const tempScore = Math.min(Math.max((temp - 15) / 25, 0), 1) * 30
  // Humidity component (0–35): lower humidity → more risk
  const humScore = Math.min(Math.max((60 - humidity) / 60, 0), 1) * 35
  // Wind component (0–20): higher wind → more risk
  const windScore = Math.min(wind / 60, 1) * 20
  // Precipitation component (0–15): lower precip probability → more risk
  const precipScore = Math.min(Math.max((20 - (precipProb ?? 20)) / 20, 0), 1) * 15
  return Math.round(tempScore + humScore + windScore + precipScore)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability',
    past_hours: '0',
    forecast_hours: '168',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 3600 } })
    const json = await res.json()
    if (!json.hourly) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const now = new Date()
    const hours: FireHour[] = json.hourly.time.map((t: string, i: number) => {
      const temp = json.hourly.temperature_2m[i]
      const humidity = json.hourly.relative_humidity_2m[i]
      const windSpeed = json.hourly.wind_speed_10m[i]
      const precipProb = json.hourly.precipitation_probability[i]
      return { time: t, temp, humidity, windSpeed, precipProb, fireIndex: calcFireIndex(temp, humidity, windSpeed, precipProb) }
    })

    const currentIdx = hours.reduce((best, h, i) =>
      Math.abs(new Date(h.time).getTime() - now.getTime()) <
      Math.abs(new Date(hours[best].time).getTime() - now.getTime()) ? i : best
    , 0)

    const current = hours[currentIdx]
    const riskScore = current.fireIndex
    const riskLevel: FireRiskLevel =
      riskScore >= 80 ? 'extremo' :
      riskScore >= 60 ? 'muy_alto' :
      riskScore >= 40 ? 'alto' :
      riskScore >= 20 ? 'moderado' : 'bajo'

    return NextResponse.json({ current, forecast: hours, riskLevel, riskScore })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
