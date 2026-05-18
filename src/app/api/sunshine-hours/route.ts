import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface SunshineData {
  todaySunshineH: number
  theoreticalMax: number
  sunshinePercent: number
  sunshineRating: 'excellent' | 'good' | 'fair' | 'poor' | 'overcast'
  brightSunshineH: number
  days: SunshineDay[]
  monthlyAvg: number
  todaySunrise: string
  todaySunset: string
}

export interface SunshineDay {
  label: string
  hours: number
  maxHours: number
  percent: number
  rating: SunshineData['sunshineRating']
  color: string
}

function theoreticalDaylight(lat: number, doy: number): number {
  const latRad = lat * Math.PI / 180
  const decl = 0.409 * Math.sin(2 * Math.PI / 365 * doy - 1.39)
  const ha = Math.acos(-Math.tan(latRad) * Math.tan(decl))
  if (isNaN(ha)) return lat > 0 && doy > 80 && doy < 270 ? 24 : 0
  return Math.round((2 * ha / (2 * Math.PI) * 24) * 10) / 10
}

function sunshineFromCloud(cloud: number, daylightH: number): number {
  if (daylightH === 0) return 0
  const factor = Math.max(0, (100 - cloud) / 100) * 0.95
  return Math.round(daylightH * factor * 10) / 10
}

function sunshineRating(pct: number): SunshineData['sunshineRating'] {
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 35) return 'fair'
  if (pct >= 10) return 'poor'
  return 'overcast'
}

const RATING_COLOR = {
  excellent: '#fbbf24',
  good:      '#facc15',
  fair:      '#a3e635',
  poor:      '#94a3b8',
  overcast:  '#475569',
}

function dayOfYear(dateStr: string): number {
  const d = new Date(dateStr)
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover,sunshine_duration&daily=sunshine_duration,sunrise,sunset,cloud_cover_mean&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const latNum = parseFloat(lat)
  const dailyTimes: string[] = raw.daily?.time ?? []
  const dailySunDur: number[] = raw.daily?.sunshine_duration ?? []
  const dailyCloud: number[]  = raw.daily?.cloud_cover_mean ?? []
  const dailySunrise: string[]= raw.daily?.sunrise ?? []
  const dailySunset: string[] = raw.daily?.sunset ?? []

  const today = dailyTimes[0] ?? new Date().toISOString().slice(0, 10)
  const doy0 = dayOfYear(today)

  const todayMaxH = theoreticalDaylight(latNum, doy0)
  const todaySunH = dailySunDur[0] != null
    ? Math.round(dailySunDur[0] / 3600 * 10) / 10
    : sunshineFromCloud(dailyCloud[0] ?? 50, todayMaxH)
  const todayPct  = todayMaxH > 0 ? Math.round(todaySunH / todayMaxH * 100) : 0

  const brightSunH = (() => {
    const clouds: number[] = raw.hourly?.cloud_cover ?? []
    const times: string[]  = raw.hourly?.time ?? []
    const todayHours = times.slice(0, 24)
    let bright = 0
    todayHours.forEach((t, i) => {
      const h = parseInt(t.slice(11, 13))
      if (h >= 8 && h <= 18 && (clouds[i] ?? 100) < 20) bright++
    })
    return bright
  })()

  const days: SunshineDay[] = dailyTimes.slice(0, 7).map((date, i) => {
    const doy  = dayOfYear(date)
    const maxH = theoreticalDaylight(latNum, doy)
    const sunH = dailySunDur[i] != null
      ? Math.round(dailySunDur[i] / 3600 * 10) / 10
      : sunshineFromCloud(dailyCloud[i] ?? 50, maxH)
    const pct  = maxH > 0 ? Math.round(sunH / maxH * 100) : 0
    const r    = sunshineRating(pct)
    return {
      label: new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      hours: sunH,
      maxHours: maxH,
      percent: pct,
      rating: r,
      color: RATING_COLOR[r],
    }
  })

  const monthlyAvg = Math.round(days.reduce((s, d) => s + d.hours, 0) / days.length * 10) / 10

  const todaySunrise = dailySunrise[0] ? dailySunrise[0].slice(11, 16) : '--:--'
  const todaySunset  = dailySunset[0]  ? dailySunset[0].slice(11, 16)  : '--:--'

  return NextResponse.json({
    todaySunshineH: todaySunH,
    theoreticalMax: todayMaxH,
    sunshinePercent: todayPct,
    sunshineRating: sunshineRating(todayPct),
    brightSunshineH: brightSunH,
    days,
    monthlyAvg,
    todaySunrise,
    todaySunset,
  } satisfies SunshineData)
}
