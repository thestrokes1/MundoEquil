import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface HeatWaveData {
  active: boolean
  currentStreak: number
  maxTemp: number
  avgNightMin: number
  heatWaveStart: string | null
  category: 'none' | 'watch' | 'warning' | 'extreme'
  days: HeatWaveDay[]
  nightsAbove20: number
  nightsAbove25: number
}

export interface HeatWaveDay {
  date: string
  label: string
  tempMax: number
  tempMin: number
  isHeatWaveDay: boolean
  anomaly: number
}

function heatWaveCategory(streak: number, max: number): HeatWaveData['category'] {
  if (streak >= 5 && max >= 40) return 'extreme'
  if (streak >= 3 && max >= 38) return 'warning'
  if (streak >= 3 && max >= 35) return 'watch'
  if (streak >= 2 && max >= 35) return 'watch'
  return 'none'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const today = new Date()
  const d14 = new Date(today)
  d14.setDate(d14.getDate() - 7)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const [archiveRes, forecastRes] = await Promise.all([
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&start_date=${fmt(d14)}&end_date=${fmt(today)}&timezone=auto`, { next: { revalidate } }),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`, { next: { revalidate } }),
  ])

  if (!forecastRes.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const forecast = await forecastRes.json()
  const archive = archiveRes.ok ? await archiveRes.json() : null

  // Compute climate normal from a rough latitude-based estimate
  // Approximate: abs(lat) drives base temp, season adjustment
  const latAbs = Math.abs(parseFloat(lat))
  const month = today.getMonth()
  const isNH = parseFloat(lat) > 0
  const summerMonth = isNH ? (month >= 5 && month <= 8) : (month >= 11 || month <= 2)
  const baseNormal = Math.max(15, 35 - latAbs * 0.45 + (summerMonth ? 5 : -5))

  const allDays: HeatWaveDay[] = []

  // Past 7 days
  if (archive?.daily?.time) {
    archive.daily.time.forEach((d: string, i: number) => {
      const tmax = archive.daily.temperature_2m_max[i] ?? 20
      const tmin = archive.daily.temperature_2m_min[i] ?? 10
      allDays.push({
        date: d,
        label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        tempMax: Math.round(tmax * 10) / 10,
        tempMin: Math.round(tmin * 10) / 10,
        isHeatWaveDay: tmax >= 35,
        anomaly: Math.round((tmax - baseNormal) * 10) / 10,
      })
    })
  }

  // Next 7 days
  forecast.daily.time.forEach((d: string, i: number) => {
    const tmax = forecast.daily.temperature_2m_max[i] ?? 20
    const tmin = forecast.daily.temperature_2m_min[i] ?? 10
    allDays.push({
      date: d,
      label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      tempMax: Math.round(tmax * 10) / 10,
      tempMin: Math.round(tmin * 10) / 10,
      isHeatWaveDay: tmax >= 35,
      anomaly: Math.round((tmax - baseNormal) * 10) / 10,
    })
  })

  // Compute current streak (consecutive heat wave days ending today or ongoing)
  const todayIdx = allDays.findIndex(d => d.date === fmt(today))
  let currentStreak = 0
  let heatWaveStart: string | null = null
  for (let i = (todayIdx >= 0 ? todayIdx : allDays.length - 1); i >= 0; i--) {
    if (allDays[i].isHeatWaveDay) {
      currentStreak++
      heatWaveStart = allDays[i].date
    } else break
  }

  const recentDays = allDays.filter(d => d.date <= fmt(today))
  const maxTemp = Math.max(0, ...recentDays.map(d => d.tempMax))
  const nightTemps = recentDays.map(d => d.tempMin)
  const avgNightMin = nightTemps.length > 0 ? Math.round(nightTemps.reduce((a, b) => a + b, 0) / nightTemps.length * 10) / 10 : 0
  const nightsAbove20 = recentDays.filter(d => d.tempMin >= 20).length
  const nightsAbove25 = recentDays.filter(d => d.tempMin >= 25).length

  return NextResponse.json({
    active: currentStreak >= 2,
    currentStreak,
    maxTemp,
    avgNightMin,
    heatWaveStart: currentStreak >= 2 ? heatWaveStart : null,
    category: heatWaveCategory(currentStreak, maxTemp),
    days: allDays.slice(-14),
    nightsAbove20,
    nightsAbove25,
  } satisfies HeatWaveData)
}
