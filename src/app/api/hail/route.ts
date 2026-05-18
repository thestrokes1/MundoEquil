import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface HailData {
  hours: HailHour[]
  currentHailProb: number
  currentCape: number
  currentShear: number
  maxHailProb: number
  maxHailSize: number
  peakHour: HailHour | null
  dailySummary: { date: string; label: string; maxProb: number; maxSize: number }[]
}

export interface HailHour {
  time: string
  hour: string
  hailProb: number
  hailSize: number
  cape: number
  shear: number
  li: number
  freezingLvl: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const params = [
    'cape', 'lifted_index', 'wind_speed_10m', 'wind_speed_80m',
    'wind_gusts_10m', 'temperature_2m', 'freezing_level_height',
    'precipitation_probability', 'precipitation',
  ].join(',')

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&forecast_days=3&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: HailHour[] = raw.hourly.time.map((t: string, i: number) => {
    const cape = raw.hourly.cape?.[i] ?? 0
    const li = raw.hourly.lifted_index?.[i] ?? 0
    const v10 = raw.hourly.wind_speed_10m?.[i] ?? 0
    const v80 = raw.hourly.wind_speed_80m?.[i] ?? 0
    const shear = Math.max(0, v80 - v10)
    const freezingLvl = raw.hourly.freezing_level_height?.[i] ?? 0

    const capeScore = cape > 1000 ? Math.min(40, (cape - 1000) / 100) : cape > 500 ? (cape - 500) / 50 : 0
    const shearScore = Math.min(30, shear * 2.0)
    const liScore = li < -1 ? Math.min(20, (-li - 1) * 4) : 0
    const freezeBonus = (freezingLvl >= 1800 && freezingLvl <= 4500) ? 10 : 0
    const hailProb = Math.min(100, Math.round(capeScore + shearScore + liScore + freezeBonus))

    const hailSize = cape > 500 && shear > 3
      ? Math.min(6, Math.round(0.00028 * Math.sqrt(cape) * shear * 10) / 10)
      : 0

    return {
      time: t,
      hour: t.slice(11, 16),
      hailProb,
      hailSize,
      cape: Math.round(cape),
      shear: Math.round(shear * 10) / 10,
      li: Math.round(li * 10) / 10,
      freezingLvl: Math.round(freezingLvl / 100) * 100,
    }
  })

  const maxHailProb = Math.max(0, ...hours.map(h => h.hailProb))
  const maxHailSize = Math.max(0, ...hours.map(h => h.hailSize))
  const peakHour = hours.find(h => h.hailProb === maxHailProb) ?? null

  const days = [...new Set(hours.map(h => h.time.slice(0, 10)))]
  const dailySummary = days.slice(0, 3).map(day => {
    const dh = hours.filter(h => h.time.startsWith(day))
    const maxProb = Math.max(0, ...dh.map(h => h.hailProb))
    const maxSize = Math.max(0, ...dh.map(h => h.hailSize))
    const label = new Date(day).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
    return { date: day, label, maxProb, maxSize }
  })

  return NextResponse.json({
    hours: hours.slice(0, 48),
    currentHailProb: hours[0]?.hailProb ?? 0,
    currentCape: hours[0]?.cape ?? 0,
    currentShear: hours[0]?.shear ?? 0,
    maxHailProb,
    maxHailSize,
    peakHour,
    dailySummary,
  } satisfies HailData)
}
