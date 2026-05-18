import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface ReturnPeriod {
  years: number
  tempHigh: number   // °C threshold exceeded once per N years
  tempLow: number    // °C cold threshold
  precipMm: number   // mm/day exceeded once per N years
}

export interface ExtremeEventsData {
  returnPeriods: ReturnPeriod[]  // 2, 5, 10, 25, 50 year
  currentTempAnomaly: number     // current temp vs 10-year avg
  maxDailyPrecip: number         // max daily precip in data
  maxTemp: number
  minTemp: number
  dataYears: number
}

function gumbelReturnLevel(mu: number, beta: number, T: number): number {
  // Gumbel distribution: x(T) = mu - beta * ln(-ln(1 - 1/T))
  return mu - beta * Math.log(-Math.log(1 - 1 / T))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const now = new Date()
  const endYear = now.getFullYear() - 1
  const startYear = endYear - 19  // 20 years of data
  const startDate = `${startYear}-01-01`
  const endDate = `${endYear}-12-31`

  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const tMax: number[] = (json.daily?.temperature_2m_max ?? []).filter((v: number) => !isNaN(v))
  const tMin: number[] = (json.daily?.temperature_2m_min ?? []).filter((v: number) => !isNaN(v))
  const precip: number[] = (json.daily?.precipitation_sum ?? []).filter((v: number) => !isNaN(v))

  if (tMax.length < 100) {
    return NextResponse.json({ error: 'Insufficient data' }, { status: 422 })
  }

  // Annual maxima (extract max per year for Gumbel fitting)
  const annualTMax: number[] = []
  const annualTMin: number[] = []
  const annualPMax: number[] = []

  const dates: string[] = json.daily?.time ?? []
  const yearGroups: Record<string, { tMax: number[]; tMin: number[]; precip: number[] }> = {}
  dates.forEach((d, i) => {
    const yr = d.slice(0, 4)
    if (!yearGroups[yr]) yearGroups[yr] = { tMax: [], tMin: [], precip: [] }
    if (!isNaN(json.daily.temperature_2m_max[i])) yearGroups[yr].tMax.push(json.daily.temperature_2m_max[i])
    if (!isNaN(json.daily.temperature_2m_min[i])) yearGroups[yr].tMin.push(json.daily.temperature_2m_min[i])
    if (!isNaN(json.daily.precipitation_sum[i])) yearGroups[yr].precip.push(json.daily.precipitation_sum[i])
  })

  for (const yr of Object.keys(yearGroups)) {
    const g = yearGroups[yr]
    if (g.tMax.length > 0) annualTMax.push(Math.max(...g.tMax))
    if (g.tMin.length > 0) annualTMin.push(Math.min(...g.tMin))
    if (g.precip.length > 0) annualPMax.push(Math.max(...g.precip))
  }

  // Fit Gumbel: method of moments
  function fitGumbel(data: number[]): { mu: number; beta: number } {
    const n = data.length
    const mean = data.reduce((a, b) => a + b, 0) / n
    const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)
    const std = Math.sqrt(variance)
    const beta = (std * Math.sqrt(6)) / Math.PI
    const mu = mean - 0.5772 * beta
    return { mu, beta }
  }

  const gTMax = fitGumbel(annualTMax)
  const gTMin = fitGumbel(annualTMin.map(v => -v))  // flip for min
  const gPrec = fitGumbel(annualPMax)

  const returnYears = [2, 5, 10, 25, 50]
  const returnPeriods: ReturnPeriod[] = returnYears.map(T => ({
    years: T,
    tempHigh: parseFloat(gumbelReturnLevel(gTMax.mu, gTMax.beta, T).toFixed(1)),
    tempLow: parseFloat((-gumbelReturnLevel(gTMin.mu, gTMin.beta, T)).toFixed(1)),
    precipMm: parseFloat(gumbelReturnLevel(gPrec.mu, gPrec.beta, T).toFixed(1)),
  }))

  // Recent 10-year average temperature vs long-term
  const recent10 = tMax.slice(-365 * 10)
  const all = tMax
  const avgRecent = recent10.reduce((a, b) => a + b, 0) / recent10.length
  const avgAll = all.reduce((a, b) => a + b, 0) / all.length
  const currentTempAnomaly = parseFloat((avgRecent - avgAll).toFixed(2))

  return NextResponse.json({
    returnPeriods,
    currentTempAnomaly,
    maxDailyPrecip: parseFloat(Math.max(...annualPMax).toFixed(1)),
    maxTemp: parseFloat(Math.max(...annualTMax).toFixed(1)),
    minTemp: parseFloat(Math.min(...annualTMin).toFixed(1)),
    dataYears: annualTMax.length,
  } satisfies ExtremeEventsData)
}
