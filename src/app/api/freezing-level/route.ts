import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface FreezingLevelData {
  currentZDA: number
  currentZDAft: number
  minZDA24h: number
  maxZDA24h: number
  snowLevelEstimate: number
  category: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'
  hours: FreezingHour[]
  days: FreezingDay[]
  significance: string
}

export interface FreezingHour {
  hour: string
  zda: number
  snowLevel: number
}

export interface FreezingDay {
  label: string
  minZDA: number
  maxZDA: number
  category: FreezingLevelData['category']
}

function zdaCategory(m: number): FreezingLevelData['category'] {
  if (m < 500)  return 'very_low'
  if (m < 1500) return 'low'
  if (m < 2500) return 'moderate'
  if (m < 3500) return 'high'
  return 'very_high'
}

function estimateZDA(t2m: number, lapse: number = 6.5): number {
  // Standard atmosphere: T decreases ~6.5°C per 1000m
  // 0°C isotherm height = T_surface / lapse * 1000
  if (t2m <= 0) return 0
  return Math.round((t2m / lapse) * 1000)
}

function snowLevelFromZDA(zda: number): number {
  // Snow level ~200-300m below freezing level for light precip
  return Math.max(0, zda - 250)
}

function significanceText(zda: number, snowLevel: number): string {
  if (zda < 500)  return 'Nivel de congelación muy bajo — nieve posible en valles'
  if (zda < 1000) return `Nieve posible por debajo de ${snowLevel}m`
  if (zda < 2000) return `Nieve en cumbres; límite de nieve ~${snowLevel}m`
  if (zda < 3000) return `Cero grados a ${zda}m — condiciones de montaña frías`
  return `Nivel de congelación alto (${zda}m) — temperaturas cálidas en capas bajas`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hourlyTemps: number[] = raw.hourly?.temperature_2m ?? []
  const hourlyTimes: string[] = raw.hourly?.time ?? []

  const hours: FreezingHour[] = hourlyTimes.slice(0, 48).map((t, i) => {
    const temp = hourlyTemps[i] ?? 10
    const zda  = estimateZDA(temp)
    return {
      hour: t.slice(11, 16),
      zda,
      snowLevel: snowLevelFromZDA(zda),
    }
  })

  const currentZDA   = hours[0]?.zda ?? 2000
  const currentZDAft = Math.round(currentZDA * 3.28084)
  const h24          = hours.slice(0, 24)
  const minZDA24h    = Math.min(...h24.map(h => h.zda))
  const maxZDA24h    = Math.max(...h24.map(h => h.zda))
  const snowLevel    = snowLevelFromZDA(currentZDA)

  const dailyTimes: string[]  = raw.daily?.time ?? []
  const dailyMaxT: number[]   = raw.daily?.temperature_2m_max ?? []
  const dailyMinT: number[]   = raw.daily?.temperature_2m_min ?? []

  const days: FreezingDay[] = dailyTimes.slice(0, 7).map((date, i) => {
    const maxT = dailyMaxT[i] ?? 10
    const minT = dailyMinT[i] ?? 5
    const minZ = estimateZDA(minT)
    const maxZ = estimateZDA(maxT)
    return {
      label: new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      minZDA: minZ,
      maxZDA: maxZ,
      category: zdaCategory((minZ + maxZ) / 2),
    }
  })

  return NextResponse.json({
    currentZDA,
    currentZDAft,
    minZDA24h,
    maxZDA24h,
    snowLevelEstimate: snowLevel,
    category: zdaCategory(currentZDA),
    hours,
    days,
    significance: significanceText(currentZDA, snowLevel),
  } satisfies FreezingLevelData)
}
