import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface WinterHour {
  time: string
  snowfall: number          // cm
  snowDepth: number         // m
  rain: number              // mm
  freezingLevel: number     // m
  temperature: number       // °C
  windSpeed: number         // km/h
  iceRisk: boolean
}

export interface WinterData {
  hours: WinterHour[]
  totalSnow48h: number      // cm
  maxSnowDepth: number      // m
  currentSnowDepth: number  // m
  freezingLevelNow: number  // m
  isWinterActive: boolean
  accumulationToday: number // cm
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', [
    'snowfall',
    'snow_depth',
    'rain',
    'freezing_level_height',
    'temperature_2m',
    'wind_speed_10m',
    'dew_point_2m',
  ].join(','))
  url.searchParams.set('past_days', '1')
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const times: string[] = json.hourly?.time ?? []
  const snowfall: number[] = json.hourly?.snowfall ?? []
  const snowDepth: number[] = json.hourly?.snow_depth ?? []
  const rain: number[] = json.hourly?.rain ?? []
  const freezing: number[] = json.hourly?.freezing_level_height ?? []
  const temp: number[] = json.hourly?.temperature_2m ?? []
  const wind: number[] = json.hourly?.wind_speed_10m ?? []
  const dew: number[] = json.hourly?.dew_point_2m ?? []

  const hours: WinterHour[] = times.map((t, i) => {
    const T = temp[i] ?? 0
    const D = dew[i] ?? 0
    const fl = freezing[i] ?? 3000
    // Ice risk: temp near/below 0, dew point near temp (high humidity)
    const iceRisk = T <= 2 && T >= -5 && (T - D) <= 3 && rain[i] > 0
    return {
      time: t,
      snowfall: parseFloat((snowfall[i] ?? 0).toFixed(1)),
      snowDepth: parseFloat((snowDepth[i] ?? 0).toFixed(2)),
      rain: parseFloat((rain[i] ?? 0).toFixed(1)),
      freezingLevel: Math.round(fl),
      temperature: parseFloat(T.toFixed(1)),
      windSpeed: parseFloat((wind[i] ?? 0).toFixed(1)),
      iceRisk,
    }
  })

  const pastIdx = 24 // 1 day past
  const futureHours = hours.slice(pastIdx)
  const next48 = futureHours.slice(0, 48)
  const todayHours = futureHours.slice(0, 24)

  const totalSnow48h = next48.reduce((s, h) => s + h.snowfall, 0)
  const accumulationToday = todayHours.reduce((s, h) => s + h.snowfall, 0)
  const maxSnowDepth = Math.max(...hours.map(h => h.snowDepth))
  const currentSnowDepth = futureHours[0]?.snowDepth ?? 0
  const freezingLevelNow = futureHours[0]?.freezingLevel ?? 3000
  const isWinterActive = totalSnow48h > 0 || currentSnowDepth > 0

  // Sample every 3h for chart
  const filteredHours = hours.filter((_, i) => i % 3 === 0)

  return NextResponse.json({
    hours: filteredHours,
    totalSnow48h: parseFloat(totalSnow48h.toFixed(1)),
    maxSnowDepth: parseFloat(maxSnowDepth.toFixed(2)),
    currentSnowDepth: parseFloat(currentSnowDepth.toFixed(2)),
    freezingLevelNow,
    isWinterActive,
    accumulationToday: parseFloat(accumulationToday.toFixed(1)),
  } satisfies WinterData)
}
