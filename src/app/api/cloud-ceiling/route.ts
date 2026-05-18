import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface CloudCeilingData {
  ceiling: number | null
  ceilingFt: number | null
  ceilingLabel: string
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR'
  flightCategoryLabel: string
  flightCategoryColor: string
  lowCloud: number
  midCloud: number
  highCloud: number
  lcl: number
  lclFt: number
  freezingLevel: number
  freezingLevelFt: number
  hours: CeilingHour[]
}

export interface CeilingHour {
  hour: string
  lowCloud: number
  midCloud: number
  highCloud: number
  ceiling: number | null
  ceilingFt: number | null
  category: 'VFR' | 'MVFR' | 'IFR' | 'LIFR'
}

function ceilingFromClouds(low: number, mid: number, high: number): number | null {
  if (low > 50)  return 300  * low / 100
  if (low > 20)  return 1500 * low / 100
  if (mid > 70)  return 3000
  if (mid > 40)  return 6000
  if (high > 80) return 9000
  if (high > 40) return 12000
  return null
}

function flightCategory(ceiling: number | null, visibility: number = 10): 'VFR' | 'MVFR' | 'IFR' | 'LIFR' {
  const ceilFt = ceiling ?? 99999
  if (ceilFt < 200 || visibility < 0.5)   return 'LIFR'
  if (ceilFt < 1000 || visibility < 3)    return 'IFR'
  if (ceilFt < 3000 || visibility < 5)    return 'MVFR'
  return 'VFR'
}

const FC_LABEL: Record<string, string> = {
  VFR: 'Vuelo visual (VFR)',
  MVFR: 'VFR marginal',
  IFR: 'Reglas instrumentos',
  LIFR: 'IFR bajo',
}
const FC_COLOR: Record<string, string> = {
  VFR: '#22c55e',
  MVFR: '#60a5fa',
  IFR: '#f97316',
  LIFR: '#7f1d1d',
}

function estimateLCL(temp: number, dew: number): number {
  return Math.round((temp - dew) / 8 * 1000)
}

function dewPoint(temp: number, rh: number): number {
  const a = 17.27, b = 237.7
  const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100)
  return (b * alpha) / (a - alpha)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,temperature_2m,relative_humidity_2m,temperature_800hPa,temperature_700hPa&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times: string[]  = raw.hourly?.time ?? []
  const low:   number[]  = raw.hourly?.cloud_cover_low ?? []
  const mid:   number[]  = raw.hourly?.cloud_cover_mid ?? []
  const high:  number[]  = raw.hourly?.cloud_cover_high ?? []
  const temps: number[]  = raw.hourly?.temperature_2m ?? []
  const rhs:   number[]  = raw.hourly?.relative_humidity_2m ?? []
  const t800:  number[]  = raw.hourly?.temperature_800hPa ?? []

  const t0   = temps[0] ?? 15
  const rh0  = rhs[0] ?? 60
  const dp   = dewPoint(t0, rh0)
  const lcl  = estimateLCL(t0, dp)
  const lclFt = Math.round(lcl * 3.281)

  // Freezing level from 800hPa temperature (roughly ~2000m)
  const t8 = t800[0] ?? 0
  const freezeM = t8 <= 0 ? 800 : Math.round(800 + t8 * 100)
  const freezeFt = Math.round(freezeM * 3.281)

  const hours: CeilingHour[] = times.slice(0, 48).map((t, i) => {
    const l = low[i] ?? 0
    const m = mid[i] ?? 0
    const h = high[i] ?? 0
    const ceil = ceilingFromClouds(l, m, h)
    const ceilFt = ceil ? Math.round(ceil * 3.281) : null
    return {
      hour: t.slice(11, 16),
      lowCloud: Math.round(l),
      midCloud: Math.round(m),
      highCloud: Math.round(h),
      ceiling: ceil ? Math.round(ceil) : null,
      ceilingFt: ceilFt,
      category: flightCategory(ceilFt),
    }
  })

  const cur = hours[0]
  const fc  = cur.category

  return NextResponse.json({
    ceiling: cur.ceiling,
    ceilingFt: cur.ceilingFt,
    ceilingLabel: cur.ceiling ? `${cur.ceiling} m / ${cur.ceilingFt} ft` : 'Sin techo nuboso',
    flightCategory: fc,
    flightCategoryLabel: FC_LABEL[fc],
    flightCategoryColor: FC_COLOR[fc],
    lowCloud: cur.lowCloud,
    midCloud: cur.midCloud,
    highCloud: cur.highCloud,
    lcl,
    lclFt,
    freezingLevel: freezeM,
    freezingLevelFt: freezeFt,
    hours,
  } satisfies CloudCeilingData)
}
