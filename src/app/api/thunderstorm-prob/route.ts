import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface ThunderstormProbData {
  currentProb: number
  maxProb24h: number
  peakHour: string | null
  risk: 'none' | 'low' | 'moderate' | 'high' | 'extreme'
  cape: number
  liftedIndex: number
  kIndex: number
  hours: ThunderstormHour[]
  days: ThunderstormDay[]
}

export interface ThunderstormHour {
  hour: string
  prob: number
  cape: number
  li: number
  risk: ThunderstormProbData['risk']
  color: string
}

export interface ThunderstormDay {
  label: string
  maxProb: number
  risk: ThunderstormProbData['risk']
  color: string
}

const RISK_COLOR = {
  none:     '#475569',
  low:      '#84cc16',
  moderate: '#eab308',
  high:     '#f97316',
  extreme:  '#ef4444',
}

function kIndex(t850: number, t700: number, t500: number, td850: number, td700: number): number {
  return (t850 - t500) + td850 - (t700 - td700)
}

function thunderstormProb(cape: number, li: number, ki: number, precip: number): number {
  let prob = 0
  if (cape > 2500) prob += 35
  else if (cape > 1000) prob += 25
  else if (cape > 300)  prob += 15
  else if (cape > 50)   prob += 5

  if (li < -6)  prob += 30
  else if (li < -3) prob += 20
  else if (li < 0)  prob += 10

  if (ki >= 35)  prob += 25
  else if (ki >= 25) prob += 15
  else if (ki >= 15) prob += 5

  if (precip > 2) prob += 20
  else if (precip > 0.5) prob += 10

  return Math.min(100, Math.max(0, Math.round(prob)))
}

function riskFromProb(prob: number): ThunderstormProbData['risk'] {
  if (prob >= 75) return 'extreme'
  if (prob >= 50) return 'high'
  if (prob >= 30) return 'moderate'
  if (prob >= 10) return 'low'
  return 'none'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cape,lifted_index,precipitation&daily=precipitation_sum&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const capes: number[]  = raw.hourly?.cape ?? []
  const lis: number[]    = raw.hourly?.lifted_index ?? []
  const precips: number[] = raw.hourly?.precipitation ?? []
  const times: string[]  = raw.hourly?.time ?? []

  const hours: ThunderstormHour[] = times.slice(0, 48).map((t, i) => {
    const cape   = capes[i] ?? 0
    const li     = lis[i] ?? 0
    const precip = precips[i] ?? 0
    const ki     = Math.max(0, cape / 50 + 20)
    const prob   = thunderstormProb(cape, li, ki, precip)
    const risk   = riskFromProb(prob)
    return {
      hour: t.slice(11, 16),
      prob,
      cape: Math.round(cape),
      li: Math.round(li * 10) / 10,
      risk,
      color: RISK_COLOR[risk],
    }
  })

  const h24     = hours.slice(0, 24)
  const maxProb = Math.max(...h24.map(h => h.prob))
  const peakH   = h24.find(h => h.prob === maxProb)
  const cape0   = capes[0] ?? 0
  const li0     = lis[0] ?? 0
  const ki0     = Math.max(0, cape0 / 50 + 20)

  const dailyTimes: string[]  = raw.daily?.time ?? []
  const dailyPrecip: number[] = raw.daily?.precipitation_sum ?? []

  const days: ThunderstormDay[] = dailyTimes.slice(0, 7).map((date, i) => {
    const dayIdx = times.findIndex(t => t.startsWith(date))
    const dayHours = dayIdx >= 0 ? hours.slice(dayIdx, dayIdx + 24) : []
    const maxDayProb = dayHours.length ? Math.max(...dayHours.map(h => h.prob)) : 0
    const risk = riskFromProb(maxDayProb)
    return {
      label: new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      maxProb: maxDayProb,
      risk,
      color: RISK_COLOR[risk],
    }
  })

  return NextResponse.json({
    currentProb: hours[0]?.prob ?? 0,
    maxProb24h: maxProb,
    peakHour: peakH?.hour ?? null,
    risk: riskFromProb(maxProb),
    cape: Math.round(cape0),
    liftedIndex: Math.round(li0 * 10) / 10,
    kIndex: Math.round(ki0),
    hours,
    days,
  } satisfies ThunderstormProbData)
}
