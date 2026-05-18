import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface WindProfileData {
  current: WindLevel[]
  hours: WindProfileHour[]
  jetStream: { speed: number; direction: number; present: boolean }
  surfaceBoundary: number
  tradeWinds: boolean
  daily: { date: string; label: string; maxSpeed80m: number; maxSpeed120m: number; direction80m: number }[]
}

export interface WindLevel {
  height: number
  label: string
  speed: number
  direction: number
  power: number
}

export interface WindProfileHour {
  time: string
  hour: string
  v10: number
  v80: number
  v120: number
  dir10: number
  dir80: number
  shear: number
}

const HEIGHTS = [10, 80, 120]
const LABELS = ['10m', '80m', '120m']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const params = [
    'wind_speed_10m', 'wind_speed_80m', 'wind_speed_120m',
    'wind_direction_10m', 'wind_direction_80m', 'wind_direction_120m',
  ].join(',')
  const daily = [
    'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant',
  ].join(',')

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&daily=${daily}&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  // Air density at ~sea level: 1.225 kg/m³ (simplified)
  const RHO = 1.225
  const CP = 0.4

  function windPowerDensity(v: number): number {
    return Math.round(0.5 * RHO * Math.pow(v / 3.6, 3) * CP)
  }

  const v10 = raw.hourly.wind_speed_10m?.[0] ?? 0
  const v80 = raw.hourly.wind_speed_80m?.[0] ?? 0
  const v120 = raw.hourly.wind_speed_120m?.[0] ?? 0
  const dir10 = raw.hourly.wind_direction_10m?.[0] ?? 0
  const dir80 = raw.hourly.wind_direction_80m?.[0] ?? 0
  const dir120 = raw.hourly.wind_direction_120m?.[0] ?? 0

  const current: WindLevel[] = [
    { height: 10, label: '10m', speed: Math.round(v10 * 10) / 10, direction: Math.round(dir10), power: windPowerDensity(v10) },
    { height: 80, label: '80m', speed: Math.round(v80 * 10) / 10, direction: Math.round(dir80), power: windPowerDensity(v80) },
    { height: 120, label: '120m', speed: Math.round(v120 * 10) / 10, direction: Math.round(dir120), power: windPowerDensity(v120) },
  ]

  const hours: WindProfileHour[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const v10h = raw.hourly.wind_speed_10m?.[i] ?? 0
    const v80h = raw.hourly.wind_speed_80m?.[i] ?? 0
    const v120h = raw.hourly.wind_speed_120m?.[i] ?? 0
    const d10h = raw.hourly.wind_direction_10m?.[i] ?? 0
    const d80h = raw.hourly.wind_direction_80m?.[i] ?? 0
    return {
      time: t,
      hour: t.slice(11, 16),
      v10: Math.round(v10h * 10) / 10,
      v80: Math.round(v80h * 10) / 10,
      v120: Math.round(v120h * 10) / 10,
      dir10: Math.round(d10h),
      dir80: Math.round(d80h),
      shear: Math.round((v80h - v10h) * 10) / 10,
    }
  })

  const days = (raw.daily?.time ?? []).map((d: string, i: number) => ({
    date: d,
    label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
    maxSpeed80m: Math.round((raw.daily.wind_speed_10m_max?.[i] ?? 0) * 1.15 * 10) / 10,
    maxSpeed120m: Math.round((raw.daily.wind_gusts_10m_max?.[i] ?? 0) * 10) / 10,
    direction80m: Math.round(raw.daily.wind_direction_10m_dominant?.[i] ?? 0),
  }))

  const latAbs = Math.abs(parseFloat(lat))
  const tradeWinds = latAbs >= 10 && latAbs <= 30 && (dir80 >= 30 && dir80 <= 90 || dir80 >= 210 && dir80 <= 270)
  const jetStream = { speed: v120, direction: dir120, present: v120 > 60 }

  return NextResponse.json({
    current,
    hours,
    jetStream,
    surfaceBoundary: Math.round(v80 - v10),
    tradeWinds,
    daily: days,
  } satisfies WindProfileData)
}
