import { NextResponse } from 'next/server'

export const revalidate = 86400  // cache 24h - records change slowly

export interface RecordsData {
  recordHigh: number | null
  recordLow: number | null
  avgHigh: number | null
  avgLow: number | null
  recordHighYear: number | null
  recordLowYear: number | null
  yearsQueried: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })

  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const currentYear = now.getFullYear()

  // Build ±5 day window around today
  const windowStart = new Date(now); windowStart.setDate(windowStart.getDate() - 5)
  const windowEnd = new Date(now); windowEnd.setDate(windowEnd.getDate() + 5)
  const wStartMD = `${String(windowStart.getMonth() + 1).padStart(2, '0')}-${String(windowStart.getDate()).padStart(2, '0')}`
  const wEndMD = `${String(windowEnd.getMonth() + 1).padStart(2, '0')}-${String(windowEnd.getDate()).padStart(2, '0')}`

  const YEARS_BACK = 20
  const allHighs: { temp: number; year: number }[] = []
  const allLows: { temp: number; year: number }[] = []

  try {
    // Query past 20 years in one batch using the archive API
    // Open-Meteo archive supports multi-year range
    const startDate = `${currentYear - YEARS_BACK}-01-01`
    const endDate = `${currentYear - 1}-12-31`

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      daily: 'temperature_2m_max,temperature_2m_min',
      start_date: startDate,
      end_date: endDate,
      timezone: 'auto',
    })

    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?${params}`,
      { next: { revalidate: 86400 } }
    )
    const json = await res.json()
    if (!json.daily) return NextResponse.json({ error: 'No data' }, { status: 502 })

    // Filter to ±5 day window (ignoring year)
    json.daily.time.forEach((dateStr: string, i: number) => {
      const dateParts = dateStr.split('-')
      const monthDay = `${dateParts[1]}-${dateParts[2]}`
      const year = parseInt(dateParts[0])

      // Check if within window (handle year boundary)
      let inWindow = false
      if (wStartMD <= wEndMD) {
        inWindow = monthDay >= wStartMD && monthDay <= wEndMD
      } else {
        // spans year boundary (Dec-Jan)
        inWindow = monthDay >= wStartMD || monthDay <= wEndMD
      }

      if (inWindow) {
        const high = json.daily.temperature_2m_max[i]
        const low = json.daily.temperature_2m_min[i]
        if (high !== null) allHighs.push({ temp: high, year })
        if (low !== null) allLows.push({ temp: low, year })
      }
    })

    const recordHighEntry = allHighs.reduce((best, h) => h.temp > best.temp ? h : best, allHighs[0] ?? { temp: -999, year: 0 })
    const recordLowEntry = allLows.reduce((best, l) => l.temp < best.temp ? l : best, allLows[0] ?? { temp: 999, year: 0 })

    const avgHigh = allHighs.length > 0
      ? parseFloat((allHighs.reduce((s, h) => s + h.temp, 0) / allHighs.length).toFixed(1))
      : null
    const avgLow = allLows.length > 0
      ? parseFloat((allLows.reduce((s, l) => s + l.temp, 0) / allLows.length).toFixed(1))
      : null

    return NextResponse.json({
      recordHigh: allHighs.length > 0 ? parseFloat(recordHighEntry.temp.toFixed(1)) : null,
      recordLow: allLows.length > 0 ? parseFloat(recordLowEntry.temp.toFixed(1)) : null,
      avgHigh,
      avgLow,
      recordHighYear: allHighs.length > 0 ? recordHighEntry.year : null,
      recordLowYear: allLows.length > 0 ? recordLowEntry.year : null,
      yearsQueried: YEARS_BACK,
    } satisfies RecordsData)
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
