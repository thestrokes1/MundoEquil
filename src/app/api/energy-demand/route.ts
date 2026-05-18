import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface EnergyDemandData {
  today: DayDemand
  days: DayDemand[]
  monthlyHDD: number
  monthlyCDD: number
  season: 'heating' | 'cooling' | 'neutral'
  peakCoolingDay: DayDemand | null
  peakHeatingDay: DayDemand | null
}

export interface DayDemand {
  date: string
  label: string
  tempMax: number
  tempMin: number
  tempAvg: number
  hdd: number
  cdd: number
  demandIndex: number
  mode: 'heating' | 'cooling' | 'neutral'
}

const BASE_TEMP = 18

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const today = new Date()
  const d30 = new Date(today)
  d30.setDate(d30.getDate() - 30)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const [forecastRes, archiveRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`, { next: { revalidate } }),
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&start_date=${fmt(d30)}&end_date=${fmt(today)}&timezone=auto`, { next: { revalidate: 86400 } }),
  ])

  if (!forecastRes.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const forecast = await forecastRes.json()
  const archive = archiveRes.ok ? await archiveRes.json() : null

  function makeDayDemand(date: string, tmax: number, tmin: number): DayDemand {
    const tavg = (tmax + tmin) / 2
    const hdd = Math.max(0, BASE_TEMP - tavg)
    const cdd = Math.max(0, tavg - BASE_TEMP)
    const mode: DayDemand['mode'] = hdd > cdd ? 'heating' : cdd > hdd ? 'cooling' : 'neutral'
    const demandIndex = Math.round(Math.max(hdd, cdd) * 10) / 10
    return {
      date,
      label: new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      tempMax: Math.round(tmax * 10) / 10,
      tempMin: Math.round(tmin * 10) / 10,
      tempAvg: Math.round(tavg * 10) / 10,
      hdd: Math.round(hdd * 10) / 10,
      cdd: Math.round(cdd * 10) / 10,
      demandIndex,
      mode,
    }
  }

  const days: DayDemand[] = forecast.daily.time.map((d: string, i: number) =>
    makeDayDemand(d, forecast.daily.temperature_2m_max[i] ?? 20, forecast.daily.temperature_2m_min[i] ?? 10)
  )

  let monthlyHDD = 0
  let monthlyCDD = 0
  if (archive?.daily?.time) {
    archive.daily.time.forEach((d: string, i: number) => {
      const tmax = archive.daily.temperature_2m_max[i] ?? 20
      const tmin = archive.daily.temperature_2m_min[i] ?? 10
      const tavg = (tmax + tmin) / 2
      monthlyHDD += Math.max(0, BASE_TEMP - tavg)
      monthlyCDD += Math.max(0, tavg - BASE_TEMP)
    })
  }

  const totalHDD = days.reduce((s, d) => s + d.hdd, 0)
  const totalCDD = days.reduce((s, d) => s + d.cdd, 0)
  const season: EnergyDemandData['season'] = totalHDD > totalCDD ? 'heating' : totalCDD > totalHDD ? 'cooling' : 'neutral'

  return NextResponse.json({
    today: days[0],
    days,
    monthlyHDD: Math.round(monthlyHDD),
    monthlyCDD: Math.round(monthlyCDD),
    season,
    peakCoolingDay: days.reduce((b, d) => d.cdd > b.cdd ? d : b, days[0]) ?? null,
    peakHeatingDay: days.reduce((b, d) => d.hdd > b.hdd ? d : b, days[0]) ?? null,
  } satisfies EnergyDemandData)
}
