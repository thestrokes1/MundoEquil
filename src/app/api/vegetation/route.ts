import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface VegetationMonth {
  month: number
  label: string
  precipMm: number
  radiationKwh: number
  ndviProxy: number      // 0–1 estimated NDVI
  growingConditions: 'excellent' | 'good' | 'fair' | 'poor' | 'dormant'
}

export interface VegetationData {
  months: VegetationMonth[]
  currentMonth: number
  currentNDVI: number
  growthStage: string
  waterDeficit: number     // mm (precip - potential ET)
  season: 'growing' | 'dormant' | 'transition'
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function ndviProxy(precip: number, radiation: number, tempMax: number): number {
  // Water availability (precip / Hargreaves ET0 approximation)
  const et0 = 0.0023 * radiation * 0.408 * Math.sqrt(Math.max(0, tempMax - 5)) * (tempMax - 5 + 17.8)
  const wetness = precip / Math.max(1, et0 * 30)
  // NDVI proxy: combination of wetness (0–1) and radiation availability
  const radFactor = Math.min(1, radiation / 7)  // normalized to 7 kWh/m²/day max
  return parseFloat(Math.min(0.95, Math.max(0, wetness * 0.6 * radFactor * 1.2)).toFixed(2))
}

function growingConditions(ndvi: number): VegetationMonth['growingConditions'] {
  if (ndvi >= 0.65) return 'excellent'
  if (ndvi >= 0.45) return 'good'
  if (ndvi >= 0.25) return 'fair'
  if (ndvi >= 0.10) return 'poor'
  return 'dormant'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const prevYear = now.getFullYear() - 1

  // Fetch last 12 months of daily data from archive (end = yesterday, never future)
  const startDate = `${prevYear}-${String(now.getMonth() + 2).padStart(2, '0')}-01`
  const endDate = fmt(yesterday)

  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('daily', 'precipitation_sum,shortwave_radiation_sum,temperature_2m_max,et0_fao_evapotranspiration')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const dates: string[] = json.daily?.time ?? []
  const precip: number[] = json.daily?.precipitation_sum ?? []
  const radiation: number[] = json.daily?.shortwave_radiation_sum ?? []
  const tMax: number[] = json.daily?.temperature_2m_max ?? []
  const et0: number[] = json.daily?.et0_fao_evapotranspiration ?? []

  // Aggregate by month
  const monthData: Record<number, { precip: number[]; radiation: number[]; tMax: number[]; et0: number[] }> = {}
  for (let m = 1; m <= 12; m++) monthData[m] = { precip: [], radiation: [], tMax: [], et0: [] }

  dates.forEach((d, i) => {
    const m = parseInt(d.slice(5, 7))
    if (!isNaN(precip[i])) monthData[m].precip.push(precip[i])
    if (!isNaN(radiation[i])) monthData[m].radiation.push(radiation[i])
    if (!isNaN(tMax[i])) monthData[m].tMax.push(tMax[i])
    if (!isNaN(et0[i])) monthData[m].et0.push(et0[i])
  })

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  const avg = (arr: number[]) => arr.length ? sum(arr) / arr.length : 0

  const currentMonth = now.getMonth() + 1

  const months: VegetationMonth[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const d = monthData[m]
    const totalPrecip = parseFloat(sum(d.precip).toFixed(1))
    const avgRadiation = parseFloat(avg(d.radiation).toFixed(2))
    const avgTMax = parseFloat(avg(d.tMax).toFixed(1))
    const ndvi = ndviProxy(totalPrecip, avgRadiation, avgTMax)
    return {
      month: m,
      label: MONTH_NAMES[i],
      precipMm: totalPrecip,
      radiationKwh: avgRadiation,
      ndviProxy: ndvi,
      growingConditions: growingConditions(ndvi),
    }
  })

  const currentNDVI = months[currentMonth - 1].ndviProxy
  const cond = months[currentMonth - 1].growingConditions

  // Water deficit this month
  const monthPrecip = sum(monthData[currentMonth].precip)
  const monthET0 = sum(monthData[currentMonth].et0)
  const waterDeficit = parseFloat((monthPrecip - monthET0).toFixed(1))

  // Season
  const lat_n = parseFloat(lat)
  const isNorth = lat_n >= 0
  const springSummer = isNorth ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 1, 2]
  const season: VegetationData['season'] = cond === 'dormant' ? 'dormant'
    : springSummer.includes(currentMonth) ? 'growing'
    : 'transition'

  const growthStage = season === 'dormant' ? 'Latencia'
    : cond === 'excellent' ? 'Crecimiento activo'
    : cond === 'good' ? 'Crecimiento moderado'
    : cond === 'fair' ? 'Crecimiento limitado'
    : 'Estrés hídrico'

  return NextResponse.json({
    months,
    currentMonth,
    currentNDVI,
    growthStage,
    waterDeficit,
    season,
  } satisfies VegetationData)
}
