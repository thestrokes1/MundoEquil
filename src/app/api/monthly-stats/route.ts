import { NextRequest, NextResponse } from 'next/server'

export interface MonthlyStats {
  month: string
  tempAvgMax: number
  tempAvgMin: number
  totalPrecipitation: number
  avgWindSpeed: number
  avgHumidity: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const now = new Date()
  const results: MonthlyStats[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    // Don't request future dates
    const endDate = lastDay > now
      ? now.toISOString().split('T')[0]
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const url = new URL('https://archive-api.open-meteo.com/v1/archive')
    url.searchParams.set('latitude', lat)
    url.searchParams.set('longitude', lon)
    url.searchParams.set('start_date', startDate)
    url.searchParams.set('end_date', endDate)
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max')
    url.searchParams.set('timezone', 'auto')

    try {
      const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
      if (!res.ok) continue
      const raw = await res.json()

      const maxTemps: number[] = raw.daily.temperature_2m_max.filter((v: number | null) => v !== null)
      const minTemps: number[] = raw.daily.temperature_2m_min.filter((v: number | null) => v !== null)
      const precips: number[] = raw.daily.precipitation_sum.filter((v: number | null) => v !== null)
      const winds: number[] = raw.daily.wind_speed_10m_max.filter((v: number | null) => v !== null)

      if (maxTemps.length === 0) continue

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

      results.push({
        month: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        tempAvgMax: Math.round(avg(maxTemps) * 10) / 10,
        tempAvgMin: Math.round(avg(minTemps) * 10) / 10,
        totalPrecipitation: Math.round(precips.reduce((a, b) => a + b, 0) * 10) / 10,
        avgWindSpeed: Math.round(avg(winds) * 10) / 10,
        avgHumidity: 0,
      })
    } catch {
      continue
    }
  }

  return NextResponse.json(results)
}
