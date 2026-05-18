import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface HeatIndexData {
  current: number
  category: HeatIndexCategory
  tempC: number
  humidity: number
  maxToday: number
  maxCategory: HeatIndexCategory
  hours: HeatIndexHour[]
  warning: string | null
}

export type HeatIndexCategory = 'comfortable' | 'caution' | 'extreme_caution' | 'danger' | 'extreme_danger'

export interface HeatIndexHour {
  hour: string
  temp: number
  humidity: number
  heatIndex: number
  category: HeatIndexCategory
  color: string
}

const CAT: Record<HeatIndexCategory, { label: string; color: string; minHI: number }> = {
  comfortable:     { label: 'Confortable',    color: '#22c55e', minHI: -Infinity },
  caution:         { label: 'Precaución',     color: '#eab308', minHI: 27 },
  extreme_caution: { label: 'Precaución extrema', color: '#f97316', minHI: 32 },
  danger:          { label: 'Peligro',        color: '#ef4444', minHI: 41 },
  extreme_danger:  { label: 'Peligro extremo',color: '#7c3aed', minHI: 54 },
}

function heatIndexC(tempC: number, rh: number): number {
  if (tempC < 27) return tempC
  const T = tempC * 9 / 5 + 32
  const HI_F = -42.379 + 2.04901523 * T + 10.14333127 * rh
    - 0.22475541 * T * rh - 0.00683783 * T * T
    - 0.05481717 * rh * rh + 0.00122874 * T * T * rh
    + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh
  return Math.round((HI_F - 32) * 5 / 9 * 10) / 10
}

function hiCategory(hi: number): HeatIndexCategory {
  if (hi >= 54) return 'extreme_danger'
  if (hi >= 41) return 'danger'
  if (hi >= 32) return 'extreme_caution'
  if (hi >= 27) return 'caution'
  return 'comfortable'
}

function warningText(cat: HeatIndexCategory, hi: number): string | null {
  if (cat === 'extreme_danger') return `Índice de calor ${hi}°C — golpe de calor inminente. Evitar exposición solar.`
  if (cat === 'danger')         return `Índice de calor ${hi}°C — riesgo de insolación. Hidratarse constantemente.`
  if (cat === 'extreme_caution') return `Índice de calor ${hi}°C — calambres y agotamiento por calor posibles.`
  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: HeatIndexHour[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const temp = raw.hourly.temperature_2m?.[i] ?? 20
    const rh   = raw.hourly.relative_humidity_2m?.[i] ?? 60
    const hi   = heatIndexC(temp, rh)
    const cat  = hiCategory(hi)
    return {
      hour: t.slice(11, 16),
      temp: Math.round(temp * 10) / 10,
      humidity: Math.round(rh),
      heatIndex: hi,
      category: cat,
      color: CAT[cat].color,
    }
  })

  const temp0 = raw.hourly.temperature_2m?.[0] ?? 20
  const rh0   = raw.hourly.relative_humidity_2m?.[0] ?? 60
  const hi0   = heatIndexC(temp0, rh0)
  const cat0  = hiCategory(hi0)
  const todayHours = hours.slice(0, 24)
  const maxToday   = Math.max(...todayHours.map(h => h.heatIndex))
  const maxCat     = hiCategory(maxToday)

  return NextResponse.json({
    current: hi0,
    category: cat0,
    tempC: Math.round(temp0 * 10) / 10,
    humidity: Math.round(rh0),
    maxToday: Math.round(maxToday * 10) / 10,
    maxCategory: maxCat,
    hours,
    warning: warningText(maxCat, Math.round(maxToday * 10) / 10),
  } satisfies HeatIndexData)
}
