import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface ConvectiveOutlookData {
  today: DayOutlook
  days: DayOutlook[]
  currentParams: { cape: number; li: number; shear: number; ki: number }
  outlookCategory: 'general' | 'marginal' | 'slight' | 'enhanced' | 'moderate' | 'high'
}

export interface DayOutlook {
  date: string
  label: string
  maxCape: number
  minLI: number
  maxShear: number
  ki: number
  outlookCategory: ConvectiveOutlookData['outlookCategory']
  convectiveProb: number
}

function kiIndex(t850: number, t500: number, td850: number, t700: number, td700: number): number {
  return (t850 - t500) + td850 - (t700 - td700)
}

function outlookCategory(cape: number, li: number, shear: number, ki: number): ConvectiveOutlookData['outlookCategory'] {
  const kiScore = ki >= 40 ? 3 : ki >= 30 ? 2 : ki >= 20 ? 1 : 0
  const capeScore = cape >= 3000 ? 3 : cape >= 1500 ? 2 : cape >= 500 ? 1 : 0
  const liScore = li <= -6 ? 3 : li <= -3 ? 2 : li <= 0 ? 1 : 0
  const shearScore = shear >= 20 ? 2 : shear >= 12 ? 1 : 0
  const total = kiScore + capeScore + liScore + shearScore

  if (total >= 9) return 'high'
  if (total >= 7) return 'moderate'
  if (total >= 5) return 'enhanced'
  if (total >= 3) return 'slight'
  if (total >= 1) return 'marginal'
  return 'general'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const params = [
    'cape', 'lifted_index', 'wind_speed_10m', 'wind_speed_80m',
    'temperature_2m', 'dew_point_2m', 'precipitation_probability',
    'thunderstorm_probability',
  ].join(',')

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&daily=wind_speed_10m_max,precipitation_probability_max,temperature_2m_max&forecast_days=5&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  // Current hourly params
  const cape0 = raw.hourly.cape?.[0] ?? 0
  const li0 = raw.hourly.lifted_index?.[0] ?? 0
  const v10 = raw.hourly.wind_speed_10m?.[0] ?? 0
  const v80 = raw.hourly.wind_speed_80m?.[0] ?? 0
  const shear0 = Math.max(0, v80 - v10)
  const td0 = raw.hourly.dew_point_2m?.[0] ?? 0
  const t0 = raw.hourly.temperature_2m?.[0] ?? 20
  // KI approximation from surface data (no upper air): use t0/td0 spread proxy
  const ki0 = Math.round(t0 - li0 * 2 + td0 - Math.max(0, t0 - td0 - 5))

  // Aggregate hourly CAPE and LI per day from hourly arrays
  const hourlyTimes: string[] = raw.hourly?.time ?? []
  const hourlyCape: number[]  = raw.hourly?.cape ?? []
  const hourlyLI:   number[]  = raw.hourly?.lifted_index ?? []
  const dailyCapeMax: Record<string, number> = {}
  const dailyLIMin:   Record<string, number> = {}
  hourlyTimes.forEach((t, i) => {
    const day = t.slice(0, 10)
    dailyCapeMax[day] = Math.max(dailyCapeMax[day] ?? 0, hourlyCape[i] ?? 0)
    dailyLIMin[day]   = Math.min(dailyLIMin[day] ?? 999, hourlyLI[i] ?? 999)
  })

  // Daily data
  const dailyTimes: string[] = raw.daily?.time ?? []
  const days: DayOutlook[] = dailyTimes.map((d: string, i: number) => {
    const cape = dailyCapeMax[d] ?? 0
    const li   = dailyLIMin[d] !== 999 ? dailyLIMin[d] : 0
    const maxWind = raw.daily.wind_speed_10m_max?.[i] ?? 0
    const shear = maxWind * 0.4
    const tmax = raw.daily.temperature_2m_max?.[i] ?? 20
    const ki = Math.round(tmax - li * 2)
    const cat = outlookCategory(cape, li, shear, ki)
    const convProb = ['general', 'marginal', 'slight', 'enhanced', 'moderate', 'high'].indexOf(cat) * 15 + (raw.daily.precipitation_probability_max?.[i] ?? 0) * 0.3
    return {
      date: d,
      label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      maxCape: Math.round(cape),
      minLI: Math.round(li * 10) / 10,
      maxShear: Math.round(shear * 10) / 10,
      ki: Math.round(ki),
      outlookCategory: cat,
      convectiveProb: Math.min(100, Math.round(convProb)),
    }
  })

  return NextResponse.json({
    today: days[0] ?? null,
    days,
    currentParams: {
      cape: Math.round(cape0),
      li: Math.round(li0 * 10) / 10,
      shear: Math.round(shear0 * 10) / 10,
      ki: ki0,
    },
    outlookCategory: days[0]?.outlookCategory ?? 'general',
  } satisfies ConvectiveOutlookData)
}
