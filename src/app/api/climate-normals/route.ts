import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface ClimateNormalsData {
  today: {
    date: string
    normalMax: number
    normalMin: number
    normalPrecip: number
    recordHigh: number
    recordLow: number
    observedMax: number
    observedMin: number
    anomalyMax: number
    anomalyMin: number
  }
  monthly: MonthNormal[]
  currentYear: { avgMax: number; avgMin: number; totalPrecip: number }
}

export interface MonthNormal {
  month: string
  normalMax: number
  normalMin: number
  normalPrecip: number
  isCurrentMonth: boolean
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const today = new Date()
  const currentYear = today.getFullYear()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  // 10-year normals (ERA5): same month/day range over past 10 years
  const yearStart = new Date(currentYear, 0, 1)
  const [normalsRes, currentYearRes, forecastRes] = await Promise.all([
    fetch(`https://climate-api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lon}&start_date=${currentYear - 10}-01-01&end_date=${currentYear - 1}-12-31&models=ERA5&monthly=temperature_2m_max,temperature_2m_min,precipitation_sum`, { next: { revalidate } }),
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=${fmt(yearStart)}&end_date=${fmt(today)}&timezone=auto`, { next: { revalidate } }),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`, { next: { revalidate: 3600 } }),
  ])

  const normals = normalsRes.ok ? await normalsRes.json() : null
  const currentYearData = currentYearRes.ok ? await currentYearRes.json() : null
  const forecastData = forecastRes.ok ? await forecastRes.json() : null

  // Build monthly normals from ERA5 10-year data
  const monthlyNormals: Record<number, { maxSum: number; minSum: number; precipSum: number; count: number }> = {}
  for (let m = 0; m < 12; m++) monthlyNormals[m] = { maxSum: 0, minSum: 0, precipSum: 0, count: 0 }

  if (normals?.monthly?.time) {
    normals.monthly.time.forEach((t: string, i: number) => {
      const m = parseInt(t.slice(5, 7)) - 1
      monthlyNormals[m].maxSum += normals.monthly.temperature_2m_max?.[i] ?? 0
      monthlyNormals[m].minSum += normals.monthly.temperature_2m_min?.[i] ?? 0
      monthlyNormals[m].precipSum += normals.monthly.precipitation_sum?.[i] ?? 0
      monthlyNormals[m].count++
    })
  }

  const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const monthly: MonthNormal[] = Array.from({ length: 12 }, (_, m) => {
    const n = monthlyNormals[m]
    const c = n.count || 1
    return {
      month: MONTH_LABELS[m],
      normalMax: Math.round(n.maxSum / c * 10) / 10,
      normalMin: Math.round(n.minSum / c * 10) / 10,
      normalPrecip: Math.round(n.precipSum / c),
      isCurrentMonth: m === today.getMonth(),
    }
  })

  const currentM = monthly[today.getMonth()]
  const todayNormalMax = currentM.normalMax
  const todayNormalMin = currentM.normalMin
  const todayNormalPrecip = currentM.normalPrecip / 30

  // Approx record from ±3 sigma
  const sigmaMax = 3.5
  const recordHigh = Math.round((todayNormalMax + sigmaMax) * 10) / 10
  const recordLow = Math.round((todayNormalMin - sigmaMax) * 10) / 10

  const observedMax = forecastData?.daily?.temperature_2m_max?.[0] ?? todayNormalMax
  const observedMin = forecastData?.daily?.temperature_2m_min?.[0] ?? todayNormalMin

  // Current year stats
  let cyMaxSum = 0, cyMinSum = 0, cyPrecipSum = 0, cyCount = 0
  if (currentYearData?.daily?.time) {
    currentYearData.daily.time.forEach((_: string, i: number) => {
      cyMaxSum += currentYearData.daily.temperature_2m_max[i] ?? 0
      cyMinSum += currentYearData.daily.temperature_2m_min[i] ?? 0
      cyPrecipSum += currentYearData.daily.precipitation_sum[i] ?? 0
      cyCount++
    })
  }
  const cyN = cyCount || 1

  return NextResponse.json({
    today: {
      date: fmt(today),
      normalMax: Math.round(todayNormalMax * 10) / 10,
      normalMin: Math.round(todayNormalMin * 10) / 10,
      normalPrecip: Math.round(todayNormalPrecip * 10) / 10,
      recordHigh,
      recordLow,
      observedMax: Math.round(observedMax * 10) / 10,
      observedMin: Math.round(observedMin * 10) / 10,
      anomalyMax: Math.round((observedMax - todayNormalMax) * 10) / 10,
      anomalyMin: Math.round((observedMin - todayNormalMin) * 10) / 10,
    },
    monthly,
    currentYear: {
      avgMax: Math.round(cyMaxSum / cyN * 10) / 10,
      avgMin: Math.round(cyMinSum / cyN * 10) / 10,
      totalPrecip: Math.round(cyPrecipSum),
    },
  } satisfies ClimateNormalsData)
}
