import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface ClimateNormal {
  month: number
  avgTempMax: number
  avgTempMin: number
  avgPrecip: number
  avgSunshine: number  // hours/day
}

export interface ClimateAnomalyData {
  normals: ClimateNormal[]      // 12 months
  currentMonth: number
  todayTempMax: number
  todayTempMin: number
  anomalyMax: number            // deviation from normal
  anomalyMin: number
  anomalyPrecipMm: number       // this month vs normal
  monthlyPrecip: number         // this month so far
  normalPrecip: number          // normal for this month
  warmingTrend: number          // °C above 1991-2020 baseline
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const now = new Date()
  const currentMonth = now.getMonth() + 1  // 1-based

  // Open-Meteo Climate API (ERA5 30-year normals 1991-2020)
  const climateUrl = new URL('https://climate-api.open-meteo.com/v1/climate')
  climateUrl.searchParams.set('latitude', lat)
  climateUrl.searchParams.set('longitude', lon)
  climateUrl.searchParams.set('start_date', '1991-01-01')
  climateUrl.searchParams.set('end_date', '2020-12-31')
  climateUrl.searchParams.set('models', 'ERA5')
  climateUrl.searchParams.set('daily', [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'sunshine_duration',
  ].join(','))

  // Also fetch recent month from archive to compute this month's actual
  const monthStart = `${now.getFullYear()}-${String(currentMonth).padStart(2, '0')}-01`
  const yesterday = new Date(now.getTime() - 86400000)
  const archiveEnd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  const archiveUrl = new URL('https://archive-api.open-meteo.com/v1/archive')
  archiveUrl.searchParams.set('latitude', lat)
  archiveUrl.searchParams.set('longitude', lon)
  archiveUrl.searchParams.set('start_date', monthStart)
  archiveUrl.searchParams.set('end_date', archiveEnd)
  archiveUrl.searchParams.set('daily', 'precipitation_sum,temperature_2m_max,temperature_2m_min')
  archiveUrl.searchParams.set('timezone', 'auto')

  // Fetch both in parallel
  const [climateRes, archiveRes] = await Promise.allSettled([
    fetch(climateUrl.toString(), { next: { revalidate: 86400 } }),
    fetch(archiveUrl.toString(), { next: { revalidate: 3600 } }),
  ])

  if (climateRes.status === 'rejected') return NextResponse.json({ error: 'Climate API error' }, { status: 502 })
  const climateJson = await (climateRes as PromiseFulfilledResult<Response>).value.json()

  // Aggregate normals by month
  const dates: string[] = climateJson.daily?.time ?? []
  const tMax: number[] = climateJson.daily?.temperature_2m_max ?? []
  const tMin: number[] = climateJson.daily?.temperature_2m_min ?? []
  const precip: number[] = climateJson.daily?.precipitation_sum ?? []
  const sunshine: number[] = climateJson.daily?.sunshine_duration ?? []  // seconds

  // Group by month, average over 30 years
  const monthBuckets: Record<number, { tMax: number[]; tMin: number[]; precip: number[]; sun: number[] }> = {}
  for (let m = 1; m <= 12; m++) monthBuckets[m] = { tMax: [], tMin: [], precip: [], sun: [] }

  dates.forEach((d, i) => {
    const m = parseInt(d.slice(5, 7))
    if (!isNaN(tMax[i])) monthBuckets[m].tMax.push(tMax[i])
    if (!isNaN(tMin[i])) monthBuckets[m].tMin.push(tMin[i])
    if (!isNaN(precip[i])) monthBuckets[m].precip.push(precip[i])
    if (!isNaN(sunshine[i])) monthBuckets[m].sun.push(sunshine[i] / 3600) // to hours
  })

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

  const normals: ClimateNormal[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const b = monthBuckets[m]
    // precip: daily avg * days_in_month approximation
    const daysInMonth = new Date(2020, m, 0).getDate()
    return {
      month: m,
      avgTempMax: parseFloat(avg(b.tMax).toFixed(1)),
      avgTempMin: parseFloat(avg(b.tMin).toFixed(1)),
      avgPrecip: parseFloat((avg(b.precip) * daysInMonth).toFixed(1)),
      avgSunshine: parseFloat(avg(b.sun).toFixed(1)),
    }
  })

  // Current month archive
  let monthlyPrecip = 0
  let todayTempMax = normals[currentMonth - 1].avgTempMax
  let todayTempMin = normals[currentMonth - 1].avgTempMin

  if (archiveRes.status === 'fulfilled') {
    const archiveJson = await (archiveRes as PromiseFulfilledResult<Response>).value.json()
    const aPrecip: number[] = archiveJson.daily?.precipitation_sum ?? []
    const aTMax: number[] = archiveJson.daily?.temperature_2m_max ?? []
    const aTMin: number[] = archiveJson.daily?.temperature_2m_min ?? []
    monthlyPrecip = parseFloat(sum(aPrecip.map(v => isNaN(v) ? 0 : v)).toFixed(1))
    const lastMax = aTMax.filter(v => !isNaN(v))
    const lastMin = aTMin.filter(v => !isNaN(v))
    if (lastMax.length) todayTempMax = parseFloat(avg(lastMax.slice(-7)).toFixed(1))
    if (lastMin.length) todayTempMin = parseFloat(avg(lastMin.slice(-7)).toFixed(1))
  }

  const normalForMonth = normals[currentMonth - 1]
  const anomalyMax = parseFloat((todayTempMax - normalForMonth.avgTempMax).toFixed(1))
  const anomalyMin = parseFloat((todayTempMin - normalForMonth.avgTempMin).toFixed(1))
  const anomalyPrecipMm = parseFloat((monthlyPrecip - normalForMonth.avgPrecip).toFixed(1))

  // Warming trend: compare 2015-2020 vs 1991-2000 for current month
  const early = monthBuckets[currentMonth].tMax.slice(0, 10 * 30)   // first 10y * ~30 days/mo
  const late = monthBuckets[currentMonth].tMax.slice(-6 * 30)        // last 6y
  const warmingTrend = parseFloat((avg(late) - avg(early)).toFixed(2))

  return NextResponse.json({
    normals,
    currentMonth,
    todayTempMax,
    todayTempMin,
    anomalyMax,
    anomalyMin,
    anomalyPrecipMm,
    monthlyPrecip,
    normalPrecip: normalForMonth.avgPrecip,
    warmingTrend,
  } satisfies ClimateAnomalyData)
}
