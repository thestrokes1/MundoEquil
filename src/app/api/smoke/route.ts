import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface SmokeHour {
  time: string
  pm25: number
  pm10: number
  dust: number
  aod: number          // Aerosol Optical Depth (proxy for smoke thickness)
  smokeScore: number   // 0–100
  category: 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous'
}

export interface SmokeData {
  hours: SmokeHour[]
  currentPm25: number
  peakPm25: number
  peakTime: string
  currentCategory: SmokeHour['category']
  smokeLikely: boolean
}

function smokeCategory(pm25: number): SmokeHour['category'] {
  if (pm25 <= 12)  return 'good'
  if (pm25 <= 35)  return 'moderate'
  if (pm25 <= 55)  return 'unhealthy_sensitive'
  if (pm25 <= 150) return 'unhealthy'
  if (pm25 <= 250) return 'very_unhealthy'
  return 'hazardous'
}

const CAT_COLORS = {
  good:               '#4ade80',
  moderate:           '#facc15',
  unhealthy_sensitive:'#fb923c',
  unhealthy:          '#f87171',
  very_unhealthy:     '#c084fc',
  hazardous:          '#9f1239',
}

export const SMOKE_CATEGORY_COLORS = CAT_COLORS

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', [
    'pm2_5',
    'pm10',
    'dust',
    'aerosol_optical_depth',
  ].join(','))
  url.searchParams.set('forecast_days', '5')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const times: string[] = json.hourly?.time ?? []
  const pm25: number[] = json.hourly?.pm2_5 ?? []
  const pm10: number[] = json.hourly?.pm10 ?? []
  const dust: number[] = json.hourly?.dust ?? []
  const aod: number[] = json.hourly?.aerosol_optical_depth ?? []

  const hours: SmokeHour[] = times.map((t, i) => {
    const p25 = pm25[i] ?? 0
    const p10 = pm10[i] ?? 0
    const d = dust[i] ?? 0
    const a = aod[i] ?? 0
    // smoke score: weight PM2.5 most, AOD secondary
    const score = Math.min(100, (p25 / 250) * 70 + (a / 2) * 20 + (d / 200) * 10)
    return {
      time: t,
      pm25: parseFloat(p25.toFixed(1)),
      pm10: parseFloat(p10.toFixed(1)),
      dust: parseFloat(d.toFixed(1)),
      aod: parseFloat(a.toFixed(3)),
      smokeScore: Math.round(score),
      category: smokeCategory(p25),
    }
  })

  // Sample every 3h
  const filtered = hours.filter((_, i) => i % 3 === 0)

  const currentPm25 = hours[0]?.pm25 ?? 0
  const peakIdx = pm25.indexOf(Math.max(...pm25))
  const peakPm25 = pm25[peakIdx] ?? 0
  const peakTime = times[peakIdx] ?? ''
  const currentCategory = smokeCategory(currentPm25)
  const smokeLikely = currentPm25 > 35 || (aod[0] ?? 0) > 0.5

  return NextResponse.json({
    hours: filtered,
    currentPm25,
    peakPm25: parseFloat(peakPm25.toFixed(1)),
    peakTime,
    currentCategory,
    smokeLikely,
  } satisfies SmokeData)
}
