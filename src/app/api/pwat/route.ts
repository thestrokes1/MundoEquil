import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface PWATData {
  currentPWAT: number
  hours: PWATHour[]
  daily: PWATDay[]
  category: 'dry' | 'normal' | 'moist' | 'very_moist' | 'extreme'
  rainfall_potential: 'low' | 'moderate' | 'high' | 'extreme'
  maxPWAT24h: number
}

export interface PWATHour {
  time: string
  hour: string
  pwat: number
  humidity: number
  temp: number
  dewPoint: number
}

export interface PWATDay {
  date: string
  label: string
  avgPWAT: number
  maxPWAT: number
  precipPotential: number
}

function pwatFromSurface(t2m: number, td2m: number, rh: number): number {
  // Simplified PWAT estimate from surface dewpoint and humidity
  // Based on Clausius-Clapeyron + column water vapor approximation
  // PWAT (mm) ≈ 1.87 * Td (°C) * (RH/100)^0.3 — empirical fit
  const td = td2m
  if (td < -20) return Math.max(0, (td + 20) * 0.3)
  return Math.max(0, Math.round((1.87 * (td + 20) * Math.pow(rh / 100, 0.3)) * 10) / 10)
}

function pwatCategory(pwat: number): PWATData['category'] {
  if (pwat >= 60) return 'extreme'
  if (pwat >= 45) return 'very_moist'
  if (pwat >= 30) return 'moist'
  if (pwat >= 15) return 'normal'
  return 'dry'
}

function rainfallPotential(pwat: number, liftedIndex: number): PWATData['rainfall_potential'] {
  const liBonus = liftedIndex < -3 ? 20 : liftedIndex < 0 ? 10 : 0
  const score = pwat + liBonus
  if (score >= 70) return 'extreme'
  if (score >= 50) return 'high'
  if (score >= 30) return 'moderate'
  return 'low'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,dew_point_2m,relative_humidity_2m,lifted_index&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: PWATHour[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const temp = raw.hourly.temperature_2m?.[i] ?? 20
    const dp = raw.hourly.dew_point_2m?.[i] ?? 10
    const rh = raw.hourly.relative_humidity_2m?.[i] ?? 60
    const pwat = pwatFromSurface(temp, dp, rh)
    return {
      time: t,
      hour: t.slice(11, 16),
      pwat,
      humidity: Math.round(rh),
      temp: Math.round(temp * 10) / 10,
      dewPoint: Math.round(dp * 10) / 10,
    }
  })

  const currentPWAT = hours[0]?.pwat ?? 0
  const maxPWAT24h = Math.max(...hours.slice(0, 24).map(h => h.pwat))
  const li0 = raw.hourly.lifted_index?.[0] ?? 0

  const daily: PWATDay[] = []
  const days = [...new Set(hours.map(h => h.time.slice(0, 10)))]
  for (const day of days) {
    const dh = hours.filter(h => h.time.startsWith(day))
    const avgPWAT = Math.round(dh.reduce((s, h) => s + h.pwat, 0) / dh.length * 10) / 10
    const maxPWAT = Math.max(...dh.map(h => h.pwat))
    daily.push({
      date: day,
      label: new Date(day).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      avgPWAT,
      maxPWAT,
      precipPotential: Math.min(100, Math.round(maxPWAT * 1.5)),
    })
  }

  return NextResponse.json({
    currentPWAT,
    hours,
    daily,
    category: pwatCategory(currentPWAT),
    rainfall_potential: rainfallPotential(currentPWAT, li0),
    maxPWAT24h: Math.round(maxPWAT24h * 10) / 10,
  } satisfies PWATData)
}
