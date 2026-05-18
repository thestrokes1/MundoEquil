import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface FishingData {
  todayIndex: number
  todayRating: 'excellent' | 'good' | 'fair' | 'poor'
  days: FishingDay[]
  currentFactors: {
    pressure: number
    pressureChange: number
    moonPhase: number
    moonIllumination: number
    windSpeed: number
    cloudCover: number
    temp: number
  }
  majorPeriods: string[]
  minorPeriods: string[]
  bestWindow: string | null
}

export interface FishingDay {
  date: string
  label: string
  index: number
  rating: FishingData['todayRating']
  moonPhase: string
  bestHour: string
}

function moonPhaseEmoji(phase: number): string {
  if (phase < 0.04 || phase > 0.96) return '🌑'
  if (phase < 0.21) return '🌒'
  if (phase < 0.29) return '🌓'
  if (phase < 0.46) return '🌔'
  if (phase < 0.54) return '🌕'
  if (phase < 0.71) return '🌖'
  if (phase < 0.79) return '🌗'
  return '🌘'
}

function moonIllumination(phase: number): number {
  // Simple approximation: full moon at phase=0.5
  return Math.round(Math.abs(Math.cos(phase * 2 * Math.PI) * 50 + 50))
}

function fishingIndex(
  pressure: number,
  pressureChange: number,
  moonPhase: number,
  wind: number,
  cloud: number,
  temp: number,
): number {
  // Pressure near 1015-1020 hPa is best; rising pressure is good
  const pressScore = pressure >= 1010 && pressure <= 1025 ? 25 : pressure > 1000 ? 15 : 5
  const changeScore = pressureChange > 0.5 ? 20 : pressureChange > 0 ? 15 : pressureChange > -1 ? 10 : 0
  // New and full moon are best
  const moonPhaseScore = moonPhase < 0.15 || moonPhase > 0.85 || (moonPhase > 0.4 && moonPhase < 0.6) ? 20 : 10
  // Low wind is better
  const windScore = wind < 10 ? 15 : wind < 20 ? 8 : 3
  // Overcast is often good for fishing
  const cloudScore = cloud > 60 ? 10 : cloud > 30 ? 7 : 5
  // Mild temp
  const tempScore = temp >= 10 && temp <= 28 ? 10 : 5

  return Math.min(100, pressScore + changeScore + moonPhaseScore + windScore + cloudScore + tempScore)
}

function fishingRating(idx: number): FishingData['todayRating'] {
  if (idx >= 75) return 'excellent'
  if (idx >= 50) return 'good'
  if (idx >= 30) return 'fair'
  return 'poor'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=surface_pressure,wind_speed_10m,cloud_cover,temperature_2m&daily=surface_pressure_mean,wind_speed_10m_max,cloud_cover_mean,temperature_2m_mean,temperature_2m_max&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const pressure0 = raw.hourly.surface_pressure?.[0] ?? 1013
  const pressure3 = raw.hourly.surface_pressure?.[3] ?? 1013
  const pressureChange = Math.round((pressure0 - pressure3) * 10) / 10
  const wind0 = raw.hourly.wind_speed_10m?.[0] ?? 5
  const cloud0 = raw.hourly.cloud_cover?.[0] ?? 40
  const temp0 = raw.hourly.temperature_2m?.[0] ?? 18

  // Moon phase: Julian date approximation
  const now = new Date()
  const jd = 367 * now.getFullYear() - Math.floor(7 * (now.getFullYear() + Math.floor((now.getMonth() + 10) / 12)) / 4) + Math.floor(275 * (now.getMonth() + 1) / 9) + now.getDate() + 1721013.5
  const moonAge = ((jd - 2451550.1) % 29.53059) / 29.53059
  const moonPhase = moonAge < 0 ? moonAge + 1 : moonAge

  const todayIndex = fishingIndex(pressure0, pressureChange, moonPhase, wind0, cloud0, temp0)

  // Solunar-style major/minor periods based on moon position
  const moonHour = Math.round(moonPhase * 24 * 2) % 24
  const majorPeriods = [
    `${moonHour.toString().padStart(2, '0')}:00–${((moonHour + 2) % 24).toString().padStart(2, '0')}:00`,
    `${((moonHour + 12) % 24).toString().padStart(2, '0')}:00–${((moonHour + 14) % 24).toString().padStart(2, '0')}:00`,
  ]
  const minorPeriods = [
    `${((moonHour + 6) % 24).toString().padStart(2, '0')}:30`,
    `${((moonHour + 18) % 24).toString().padStart(2, '0')}:30`,
  ]

  const days: FishingDay[] = (raw.daily?.time ?? []).map((d: string, i: number) => {
    const p = raw.daily.surface_pressure_mean?.[i] ?? 1013
    const w = raw.daily.wind_speed_10m_max?.[i] ?? 10
    const c = raw.daily.cloud_cover_mean?.[i] ?? 40
    const t = raw.daily.temperature_2m_mean?.[i] ?? 18
    const dayMoonPhase = ((moonPhase * 29.53 + i) % 29.53) / 29.53
    const idx = fishingIndex(p, 0, dayMoonPhase, w, c, t)
    return {
      date: d,
      label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      index: idx,
      rating: fishingRating(idx),
      moonPhase: moonPhaseEmoji(dayMoonPhase),
      bestHour: majorPeriods[0].slice(0, 5),
    }
  })

  const bestWindow = majorPeriods[0]

  return NextResponse.json({
    todayIndex,
    todayRating: fishingRating(todayIndex),
    days,
    currentFactors: {
      pressure: Math.round(pressure0 * 10) / 10,
      pressureChange,
      moonPhase: Math.round(moonPhase * 100) / 100,
      moonIllumination: moonIllumination(moonPhase),
      windSpeed: Math.round(wind0),
      cloudCover: Math.round(cloud0),
      temp: Math.round(temp0 * 10) / 10,
    },
    majorPeriods,
    minorPeriods,
    bestWindow,
  } satisfies FishingData)
}
