import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface TornadoData {
  hours: TornadoHour[]
  currentEHI: number
  currentSTP: number
  currentCape: number
  currentShear: number
  category: 'none' | 'low' | 'moderate' | 'high' | 'extreme'
  dailySummary: { date: string; label: string; maxEHI: number; maxSTP: number }[]
}

export interface TornadoHour {
  time: string
  hour: string
  ehi: number
  stp: number
  cape: number
  shear: number
  li: number
  tornadoProb: number
}

function tornadoCategory(ehi: number): TornadoData['category'] {
  if (ehi >= 3) return 'extreme'
  if (ehi >= 1.5) return 'high'
  if (ehi >= 0.5) return 'moderate'
  if (ehi >= 0.1) return 'low'
  return 'none'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const params = [
    'cape', 'lifted_index', 'wind_speed_10m', 'wind_speed_80m',
    'wind_speed_120m', 'wind_direction_10m', 'wind_direction_80m',
    'temperature_2m', 'dew_point_2m', 'surface_pressure',
  ].join(',')

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&forecast_days=3&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: TornadoHour[] = raw.hourly.time.map((t: string, i: number) => {
    const cape = raw.hourly.cape?.[i] ?? 0
    const li = raw.hourly.lifted_index?.[i] ?? 0
    const v10 = raw.hourly.wind_speed_10m?.[i] ?? 0
    const v80 = raw.hourly.wind_speed_80m?.[i] ?? 0
    const v120 = raw.hourly.wind_speed_120m?.[i] ?? 0
    const shear = Math.max(0, v120 - v10)

    // EHI proxy: CAPE × shear / 160000 (simplified, no true SRH)
    const ehi = cape > 100 ? Math.min(5, (cape * shear) / 160000) : 0

    // STP proxy: simplified significant tornado parameter
    // STP = (CAPE/1500) × (-LI/4) × (shear/20) clamped
    const stpCape = Math.min(1, cape / 1500)
    const stpLI = li < -1 ? Math.min(1, (-li - 1) / 3) : 0
    const stpShear = Math.min(1, shear / 18)
    const stp = Math.round(stpCape * stpLI * stpShear * 100) / 100

    const tornadoProb = Math.min(100, Math.round(ehi * 25 + stp * 30))

    return {
      time: t,
      hour: t.slice(11, 16),
      ehi: Math.round(ehi * 100) / 100,
      stp: Math.round(stp * 100) / 100,
      cape: Math.round(cape),
      shear: Math.round(shear * 10) / 10,
      li: Math.round(li * 10) / 10,
      tornadoProb,
    }
  })

  const maxEHI = Math.max(0, ...hours.map(h => h.ehi))
  const days = [...new Set(hours.map(h => h.time.slice(0, 10)))]
  const dailySummary = days.slice(0, 3).map(day => {
    const dh = hours.filter(h => h.time.startsWith(day))
    return {
      date: day,
      label: new Date(day).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      maxEHI: Math.max(0, ...dh.map(h => h.ehi)),
      maxSTP: Math.max(0, ...dh.map(h => h.stp)),
    }
  })

  return NextResponse.json({
    hours: hours.slice(0, 48),
    currentEHI: hours[0]?.ehi ?? 0,
    currentSTP: hours[0]?.stp ?? 0,
    currentCape: hours[0]?.cape ?? 0,
    currentShear: hours[0]?.shear ?? 0,
    category: tornadoCategory(maxEHI),
    dailySummary,
  } satisfies TornadoData)
}
