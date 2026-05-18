import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface FogHour {
  time: string
  visibility: number       // m (Open-Meteo returns km, we convert)
  dewPoint: number         // °C
  temperature: number      // °C
  humidity: number         // %
  cloudCoverLow: number    // %
  windSpeed: number        // km/h
  fogProbability: number   // computed 0–100
}

export interface FogData {
  hours: FogHour[]
  fogWindowsToday: { start: string; end: string }[]
  worstVisibility: number  // m
  currentFogProb: number
}

function fogProb(vis: number, dewSpread: number, rh: number, cloudLow: number, wind: number): number {
  // vis in km: <1km = dense fog, 1-5km = fog, 5-10km = mist
  const visScore = vis < 1 ? 40 : vis < 5 ? 25 : vis < 10 ? 10 : 0
  // dew spread < 2°C = high risk
  const dewScore = dewSpread < 1 ? 30 : dewSpread < 2 ? 20 : dewSpread < 4 ? 8 : 0
  // RH > 90% favors fog
  const rhScore = rh > 95 ? 20 : rh > 90 ? 12 : rh > 80 ? 4 : 0
  // Low cloud cover
  const cloudScore = cloudLow > 80 ? 10 : 0
  // Wind suppresses fog if > 15 km/h
  const windPenalty = wind > 15 ? 15 : wind > 8 ? 5 : 0
  return Math.min(100, Math.max(0, visScore + dewScore + rhScore + cloudScore - windPenalty))
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
    'visibility',
    'dew_point_2m',
    'temperature_2m',
    'relative_humidity_2m',
    'cloud_cover_low',
    'wind_speed_10m',
  ].join(','))
  url.searchParams.set('forecast_days', '3')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const times: string[] = json.hourly?.time ?? []
  const vis: number[] = json.hourly?.visibility ?? []    // meters
  const dew: number[] = json.hourly?.dew_point_2m ?? []
  const temp: number[] = json.hourly?.temperature_2m ?? []
  const rh: number[] = json.hourly?.relative_humidity_2m ?? []
  const cloudLow: number[] = json.hourly?.cloud_cover_low ?? []
  const wind: number[] = json.hourly?.wind_speed_10m ?? []

  const hours: FogHour[] = times.map((t, i) => {
    const T = temp[i] ?? 15
    const D = dew[i] ?? 10
    const V = (vis[i] ?? 10000) / 1000  // convert m to km
    const RH = rh[i] ?? 50
    const CL = cloudLow[i] ?? 0
    const W = wind[i] ?? 0
    const spread = T - D
    return {
      time: t,
      visibility: Math.round(vis[i] ?? 10000),
      dewPoint: parseFloat(D.toFixed(1)),
      temperature: parseFloat(T.toFixed(1)),
      humidity: Math.round(RH),
      cloudCoverLow: Math.round(CL),
      windSpeed: parseFloat(W.toFixed(1)),
      fogProbability: fogProb(V, spread, RH, CL, W),
    }
  })

  // Find fog windows today (first 24h)
  const todayHours = hours.slice(0, 24)
  const fogWindows: FogData['fogWindowsToday'] = []
  let inFog = false
  let windowStart = ''
  for (const h of todayHours) {
    if (h.fogProbability >= 40 && !inFog) {
      inFog = true
      windowStart = h.time
    } else if (h.fogProbability < 40 && inFog) {
      inFog = false
      fogWindows.push({ start: windowStart, end: h.time })
    }
  }
  if (inFog) fogWindows.push({ start: windowStart, end: todayHours[todayHours.length - 1].time })

  const worstVisibility = Math.min(...hours.map(h => h.visibility))
  const currentFogProb = hours[0]?.fogProbability ?? 0

  return NextResponse.json({
    hours,
    fogWindowsToday: fogWindows,
    worstVisibility,
    currentFogProb,
  } satisfies FogData)
}
