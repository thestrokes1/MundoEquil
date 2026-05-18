import { NextResponse } from 'next/server'

export const revalidate = 3600

export interface AccumDay {
  date: string
  precip: number
  cumulative: number
}

export interface PrecipAccumulationData {
  thisMonth: AccumDay[]
  monthlyAvgMm: number | null  // Historical average for this month (mm total)
  yearToDateMm: number
  comparedToAvg: number | null  // % vs historical average (100 = normal)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
  const today = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  try {
    // Fetch current month's precipitation
    const currentParams = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      daily: 'precipitation_sum',
      start_date: startOfMonth,
      end_date: today,
      timezone: 'auto',
    })

    const currentRes = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?${currentParams}`,
      { next: { revalidate: 3600 } }
    )
    const currentJson = await currentRes.json()
    if (!currentJson.daily) return NextResponse.json({ error: 'No data' }, { status: 502 })

    // Build cumulative series
    let running = 0
    const thisMonth: AccumDay[] = currentJson.daily.time.map((date: string, i: number) => {
      const p = currentJson.daily.precipitation_sum[i] ?? 0
      running += p
      return { date, precip: p, cumulative: parseFloat(running.toFixed(1)) }
    })

    // Fetch historical average: same month for past 5 years
    const historicalTotals: number[] = []
    const daysInCurrentMonth = now.getDate()

    await Promise.allSettled(
      [1, 2, 3, 4, 5].map(async yearsAgo => {
        const histYear = year - yearsAgo
        const histStart = `${histYear}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(histYear, month, 0).getDate()
        const histEnd = `${histYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        const histParams = new URLSearchParams({
          latitude: lat,
          longitude: lon,
          daily: 'precipitation_sum',
          start_date: histStart,
          end_date: histEnd,
          timezone: 'auto',
        })

        const histRes = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?${histParams}`,
          { next: { revalidate: 86400 } }
        )
        const histJson = await histRes.json()
        if (histJson.daily?.precipitation_sum) {
          // Pro-rate to same number of days as current month progress
          const monthTotal: number = histJson.daily.precipitation_sum
            .slice(0, daysInCurrentMonth)
            .reduce((s: number, v: number | null) => s + (v ?? 0), 0)
          historicalTotals.push(monthTotal)
        }
      })
    )

    const currentTotal = running
    const monthlyAvgMm = historicalTotals.length > 0
      ? parseFloat((historicalTotals.reduce((a, b) => a + b, 0) / historicalTotals.length).toFixed(1))
      : null

    const comparedToAvg = monthlyAvgMm !== null && monthlyAvgMm > 0
      ? parseFloat(((currentTotal / monthlyAvgMm) * 100).toFixed(0))
      : null

    return NextResponse.json({
      thisMonth,
      monthlyAvgMm,
      yearToDateMm: parseFloat(currentTotal.toFixed(1)),
      comparedToAvg,
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
