import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface DewComfortData {
  currentDewPoint: number
  currentHumidity: number
  comfortLevel: 'pleasant' | 'comfortable' | 'sticky' | 'uncomfortable' | 'oppressive' | 'severe'
  comfortScore: number
  hours: DewHour[]
  daily: DewDay[]
  mugginessPeak: DewHour | null
}

export interface DewHour {
  time: string
  hour: string
  dewPoint: number
  humidity: number
  temp: number
  comfortLevel: DewComfortData['comfortLevel']
}

export interface DewDay {
  date: string
  label: string
  maxDewPoint: number
  minDewPoint: number
  avgDewPoint: number
  comfortLevel: DewComfortData['comfortLevel']
}

function dewComfortLevel(dp: number): DewComfortData['comfortLevel'] {
  if (dp >= 26) return 'severe'
  if (dp >= 24) return 'oppressive'
  if (dp >= 21) return 'uncomfortable'
  if (dp >= 18) return 'sticky'
  if (dp >= 13) return 'comfortable'
  return 'pleasant'
}

function dewComfortScore(dp: number): number {
  // 100 = driest, 0 = most oppressive
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, dp - 5) * 4)))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=dew_point_2m,relative_humidity_2m,temperature_2m&daily=dew_point_2m_max,dew_point_2m_min,temperature_2m_mean,relative_humidity_2m_mean&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: DewHour[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const dp = raw.hourly.dew_point_2m?.[i] ?? 10
    return {
      time: t,
      hour: t.slice(11, 16),
      dewPoint: Math.round(dp * 10) / 10,
      humidity: Math.round(raw.hourly.relative_humidity_2m?.[i] ?? 60),
      temp: Math.round((raw.hourly.temperature_2m?.[i] ?? 20) * 10) / 10,
      comfortLevel: dewComfortLevel(dp),
    }
  })

  const daily: DewDay[] = (raw.daily?.time ?? []).map((d: string, i: number) => {
    const maxDp = raw.daily.dew_point_2m_max?.[i] ?? 10
    const minDp = raw.daily.dew_point_2m_min?.[i] ?? 5
    const avgDp = (maxDp + minDp) / 2
    return {
      date: d,
      label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      maxDewPoint: Math.round(maxDp * 10) / 10,
      minDewPoint: Math.round(minDp * 10) / 10,
      avgDewPoint: Math.round(avgDp * 10) / 10,
      comfortLevel: dewComfortLevel(maxDp),
    }
  })

  const currentDewPoint = hours[0]?.dewPoint ?? 10
  const mugginessPeak = hours.reduce(
    (b, h) => h.dewPoint > b.dewPoint ? h : b,
    hours[0]
  ) ?? null

  return NextResponse.json({
    currentDewPoint,
    currentHumidity: hours[0]?.humidity ?? 60,
    comfortLevel: dewComfortLevel(currentDewPoint),
    comfortScore: dewComfortScore(currentDewPoint),
    hours,
    daily,
    mugginessPeak,
  } satisfies DewComfortData)
}
