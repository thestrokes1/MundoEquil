import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface SolarYieldDay {
  date: string
  ghi: number           // Global Horizontal Irradiance kWh/m²/day
  dni: number           // Direct Normal Irradiance kWh/m²/day
  temperature: number   // avg °C (affects panel efficiency)
  estimatedYield: number // kWh for 1 kWp system
  efficiency: number    // panel efficiency factor (0–1)
}

export interface SolarYieldData {
  days: SolarYieldDay[]
  totalGHI7d: number
  avgYield7d: number      // kWh/day for 1 kWp
  bestDay: string
  worstDay: string
  peakSunHours: number   // PSH today
  performanceRatio: number // typical 0.75-0.85
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('daily', [
    'shortwave_radiation_sum',     // kWh/m²/day (= GHI)
    'direct_radiation_sum',         // proxy for DNI (daily sum)
    'temperature_2m_max',
    'temperature_2m_min',
    'sunshine_duration',           // seconds
  ].join(','))
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const dates: string[] = json.daily?.time ?? []
  const ghi: number[] = json.daily?.shortwave_radiation_sum ?? []
  const dni: number[] = json.daily?.direct_radiation_sum ?? []
  const tMax: number[] = json.daily?.temperature_2m_max ?? []
  const tMin: number[] = json.daily?.temperature_2m_min ?? []
  const sunshine: number[] = json.daily?.sunshine_duration ?? []

  const PR = 0.80  // performance ratio (realistic for modern systems)
  const NOCT = 45  // nominal operating cell temperature

  const days: SolarYieldDay[] = dates.map((d, i) => {
    const G = ghi[i] ?? 0
    const avgT = ((tMax[i] ?? 20) + (tMin[i] ?? 10)) / 2
    // Cell temperature derating: -0.45%/°C above 25°C STC
    const cellTemp = avgT + (G / 0.8) * ((NOCT - 20) / 800)
    const tempDerate = 1 + (-0.0045) * (cellTemp - 25)
    const efficiency = Math.max(0.6, Math.min(1.05, tempDerate))
    // Estimated yield (kWh/kWp/day): GHI × PR × temp efficiency
    const yield_ = parseFloat((G * PR * efficiency).toFixed(2))

    return {
      date: d,
      ghi: parseFloat(G.toFixed(2)),
      dni: parseFloat(((dni[i] ?? 0) / 1000).toFixed(2)),  // W/m² to kW/m²
      temperature: parseFloat(avgT.toFixed(1)),
      estimatedYield: yield_,
      efficiency: parseFloat(efficiency.toFixed(3)),
    }
  })

  const totalGHI7d = parseFloat(days.reduce((s, d) => s + d.ghi, 0).toFixed(2))
  const avgYield7d = parseFloat((days.reduce((s, d) => s + d.estimatedYield, 0) / days.length).toFixed(2))
  const bestDay = days.reduce((b, d) => d.estimatedYield > b.estimatedYield ? d : b, days[0])?.date ?? ''
  const worstDay = days.reduce((w, d) => d.estimatedYield < w.estimatedYield ? d : w, days[0])?.date ?? ''
  const peakSunHours = parseFloat((days[0]?.ghi ?? 0).toFixed(2))

  return NextResponse.json({
    days,
    totalGHI7d,
    avgYield7d,
    bestDay,
    worstDay,
    peakSunHours,
    performanceRatio: PR,
  } satisfies SolarYieldData)
}
