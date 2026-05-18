import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface DroughtData {
  spi30: number
  deficit: number
  surplusOrDeficit: 'surplus' | 'deficit' | 'normal'
  category: 'extreme_wet' | 'wet' | 'normal' | 'mild_drought' | 'moderate_drought' | 'severe_drought' | 'extreme_drought'
  recentPrecip: number
  normalPrecip: number
  months: { label: string; precip: number; normal: number }[]
  et0Sum: number
  waterBalance: number
}

function spiCategory(spi: number): DroughtData['category'] {
  if (spi >= 2.0) return 'extreme_wet'
  if (spi >= 1.0) return 'wet'
  if (spi >= -0.5) return 'normal'
  if (spi >= -1.0) return 'mild_drought'
  if (spi >= -1.5) return 'moderate_drought'
  if (spi >= -2.0) return 'severe_drought'
  return 'extreme_drought'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const today = new Date()
  const d90 = new Date(today)
  d90.setDate(d90.getDate() - 90)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  // Fetch recent 90 days + same 90 days 5 years ago for normal
  const [recentRes, normalRes] = await Promise.all([
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,et0_fao_evapotranspiration&start_date=${fmt(d90)}&end_date=${fmt(today)}&timezone=auto`, { next: { revalidate } }),
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&start_date=${fmt(new Date(d90.getFullYear() - 5, d90.getMonth(), d90.getDate()))}&end_date=${fmt(new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()))}&timezone=auto`, { next: { revalidate } }),
  ])

  if (!recentRes.ok) return NextResponse.json({ error: 'Archive error' }, { status: 502 })
  const recent = await recentRes.json()
  const normalData = normalRes.ok ? await normalRes.json() : null

  const recentPrecip: number = (recent.daily?.precipitation_sum ?? []).reduce((a: number, v: number | null) => a + (v ?? 0), 0)
  const et0Sum: number = (recent.daily?.et0_fao_evapotranspiration ?? []).reduce((a: number, v: number | null) => a + (v ?? 0), 0)
  const normalPrecip: number = normalData
    ? (normalData.daily?.precipitation_sum ?? []).reduce((a: number, v: number | null) => a + (v ?? 0), 0)
    : recentPrecip * 1.1

  const deficit = Math.round(recentPrecip - normalPrecip)
  const sigma = normalPrecip * 0.3
  const spi30 = sigma > 0 ? Math.max(-3, Math.min(3, (recentPrecip - normalPrecip) / sigma)) : 0
  const waterBalance = Math.round(recentPrecip - et0Sum)

  // Monthly breakdown (last 3 months)
  const months: DroughtData['months'] = []
  const recentDates: string[] = recent.daily?.time ?? []
  const recentVals: (number | null)[] = recent.daily?.precipitation_sum ?? []
  const monthMap: Record<string, number> = {}
  recentDates.forEach((d: string, i: number) => {
    const key = d.slice(0, 7)
    monthMap[key] = (monthMap[key] ?? 0) + (recentVals[i] ?? 0)
  })
  const normalMonthMap: Record<string, number> = {}
  if (normalData) {
    const nd: string[] = normalData.daily?.time ?? []
    const nv: (number | null)[] = normalData.daily?.precipitation_sum ?? []
    nd.forEach((d: string, i: number) => {
      const key = new Date(d)
      key.setFullYear(key.getFullYear() + 5)
      const k = key.toISOString().slice(0, 7)
      normalMonthMap[k] = (normalMonthMap[k] ?? 0) + (nv[i] ?? 0)
    })
  }
  for (const [key, val] of Object.entries(monthMap).slice(-3)) {
    const [y, m] = key.split('-')
    months.push({
      label: new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('es-MX', { month: 'short' }),
      precip: Math.round(val),
      normal: Math.round(normalMonthMap[key] ?? val),
    })
  }

  return NextResponse.json({
    spi30: Math.round(spi30 * 100) / 100,
    deficit,
    surplusOrDeficit: deficit > 10 ? 'surplus' : deficit < -10 ? 'deficit' : 'normal',
    category: spiCategory(spi30),
    recentPrecip: Math.round(recentPrecip),
    normalPrecip: Math.round(normalPrecip),
    months,
    et0Sum: Math.round(et0Sum),
    waterBalance,
  } satisfies DroughtData)
}
