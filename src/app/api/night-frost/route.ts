import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface NightFrostData {
  frostTonight: boolean
  frostProbability: number
  minTempTonight: number
  groundFrostRisk: boolean
  firstFrostHour: string | null
  lastFrostHour: string | null
  frostDuration: number
  days: FrostDay[]
}

export interface FrostDay {
  date: string
  label: string
  minTemp: number
  frostRisk: 'none' | 'slight' | 'moderate' | 'severe'
  frostProb: number
}

function frostProbability(minTemp: number, dewpoint: number, windSpeed: number, cloudCover: number): number {
  if (minTemp > 4) return 0
  let prob = 0
  if (minTemp <= 0)  prob += 60
  else if (minTemp <= 2) prob += 35
  else if (minTemp <= 4) prob += 15
  if (cloudCover < 30)  prob += 20
  else if (cloudCover > 70) prob -= 15
  if (windSpeed < 5) prob += 15
  else if (windSpeed > 15) prob -= 10
  const dewSpread = minTemp - dewpoint
  if (dewSpread < 2) prob += 15
  return Math.min(100, Math.max(0, Math.round(prob)))
}

function frostRisk(minTemp: number): FrostDay['frostRisk'] {
  if (minTemp > 2)  return 'none'
  if (minTemp > -2) return 'slight'
  if (minTemp > -5) return 'moderate'
  return 'severe'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,dew_point_2m,wind_speed_10m,cloud_cover&daily=temperature_2m_min&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times: string[] = raw.hourly?.time ?? []
  const temps: number[] = raw.hourly?.temperature_2m ?? []
  const dewpoints: number[] = raw.hourly?.dew_point_2m ?? []
  const winds: number[] = raw.hourly?.wind_speed_10m ?? []
  const clouds: number[] = raw.hourly?.cloud_cover ?? []

  // Tonight: hours 18–06 of day 0
  const tonight = times.slice(0, 36).filter((t, i) => {
    const h = parseInt(t.slice(11, 13))
    return h >= 18 || h <= 6
  }).map(t => times.indexOf(t))

  const tonightTemps = tonight.map(i => temps[i] ?? 20)
  const minTempTonight = Math.round(Math.min(...tonightTemps) * 10) / 10
  const tonightWind = Math.min(...tonight.map(i => winds[i] ?? 10))
  const tonightCloud = tonight.reduce((s, i) => s + (clouds[i] ?? 50), 0) / Math.max(1, tonight.length)
  const tonightDp = tonight.reduce((s, i) => s + (dewpoints[i] ?? 10), 0) / Math.max(1, tonight.length)
  const frostProb = frostProbability(minTempTonight, tonightDp, tonightWind, tonightCloud)
  const frostTonight = minTempTonight <= 0

  const frostHours = tonight.filter(i => (temps[i] ?? 20) <= 0).map(i => times[i]?.slice(11, 16) ?? '')
  const firstFrostHour = frostHours[0] ?? null
  const lastFrostHour  = frostHours[frostHours.length - 1] ?? null
  const frostDuration  = frostHours.length

  const dailyTimes: string[]  = raw.daily?.time ?? []
  const dailyMins: number[]   = raw.daily?.temperature_2m_min ?? []

  const days: FrostDay[] = dailyTimes.slice(0, 7).map((date, i) => {
    const minT = Math.round((dailyMins[i] ?? 10) * 10) / 10
    const dayIdx = times.findIndex(t => t.startsWith(date))
    const dpDay = dayIdx >= 0 ? dewpoints[dayIdx] ?? 10 : 10
    const windDay = dayIdx >= 0 ? winds[dayIdx] ?? 10 : 10
    const cloudDay = dayIdx >= 0 ? clouds[dayIdx] ?? 50 : 50
    return {
      date,
      label: new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      minTemp: minT,
      frostRisk: frostRisk(minT),
      frostProb: frostProbability(minT, dpDay, windDay, cloudDay),
    }
  })

  return NextResponse.json({
    frostTonight,
    frostProbability: frostProb,
    minTempTonight,
    groundFrostRisk: minTempTonight <= 2,
    firstFrostHour,
    lastFrostHour,
    frostDuration,
    days,
  } satisfies NightFrostData)
}
