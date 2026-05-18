import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface ThunderstormHour {
  time: string
  cape: number                   // J/kg
  liftedIndex: number            // K
  precipProbability: number      // %
  thunderProbability: number     // %
  convectiveRisk: 'none' | 'low' | 'moderate' | 'high' | 'extreme'
}

export interface ThunderstormData {
  hours: ThunderstormHour[]
  peakCape: number
  peakTime: string
  currentRisk: ThunderstormHour['convectiveRisk']
  riskScore: number
}

function convectiveRisk(cape: number, li: number, tProb: number): ThunderstormHour['convectiveRisk'] {
  // LI: >0 stable, 0 to -2 slight, -2 to -4 moderate, -4 to -6 large, < -6 extreme
  if (cape < 100 && li > 0) return 'none'
  if (cape < 500 || li > -2) return 'low'
  if (cape < 1500 || li > -4) return 'moderate'
  if (cape < 2500 || li > -6) return 'high'
  return 'extreme'
}

function riskScore(cape: number, li: number, tProb: number): number {
  const capeScore = Math.min(40, (cape / 3000) * 40)
  const liScore = Math.min(35, (Math.max(0, -li) / 8) * 35)
  const tScore = (tProb / 100) * 25
  return Math.round(capeScore + liScore + tScore)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', [
    'cape',
    'lifted_index',
    'precipitation_probability',
    'thunderstorm_probability',
  ].join(','))
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const times: string[] = json.hourly?.time ?? []
  const cape: number[] = json.hourly?.cape ?? []
  const li: number[] = json.hourly?.lifted_index ?? []
  const pp: number[] = json.hourly?.precipitation_probability ?? []
  const tp: number[] = json.hourly?.thunderstorm_probability ?? []

  const hours: ThunderstormHour[] = times.map((t, i) => {
    const c = cape[i] ?? 0
    const l = li[i] ?? 5
    const p = pp[i] ?? 0
    const thr = tp[i] ?? 0
    return {
      time: t,
      cape: Math.round(c),
      liftedIndex: parseFloat(l.toFixed(1)),
      precipProbability: Math.round(p),
      thunderProbability: Math.round(thr),
      convectiveRisk: convectiveRisk(c, l, thr),
    }
  })

  // Only keep noon hours for 7-day overview + all hours for first 48h
  const now = new Date()
  const cutoff = new Date(now.getTime() + 48 * 3600_000).toISOString().slice(0, 16)
  const filtered = hours.filter(h => h.time <= cutoff || h.time.endsWith('T12:00'))

  const peakIdx = cape.indexOf(Math.max(...cape))
  const peakCape = cape[peakIdx] ?? 0
  const peakTime = times[peakIdx] ?? ''

  const currentHour = hours[0]
  const currentRisk = currentHour?.convectiveRisk ?? 'none'
  const score = riskScore(currentHour?.cape ?? 0, currentHour?.liftedIndex ?? 5, currentHour?.thunderProbability ?? 0)

  return NextResponse.json({
    hours: filtered,
    peakCape: Math.round(peakCape),
    peakTime,
    currentRisk,
    riskScore: score,
  } satisfies ThunderstormData)
}
