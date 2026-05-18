import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface ClimateZoneData {
  koppen: string
  koppenLabel: string
  koppenDesc: string
  koppenColor: string
  mainGroup: string
  subType: string
  characteristics: string[]
  seasonality: string
  annualTemp: number
  annualPrecip: number
  dryMonth: string | null
  wetMonth: string | null
  monthlyTemp: MonthlyClimate[]
  monthlyPrecip: MonthlyClimate[]
}

export interface MonthlyClimate {
  month: string
  value: number
}

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function koppenClassify(
  annualTemp: number,
  annualPrecip: number,
  monthlyTemps: number[],
  monthlyPrecips: number[],
  lat: number,
): { code: string; label: string; desc: string; color: string; main: string; sub: string; chars: string[]; seasonality: string } {
  const coldestMonth = Math.min(...monthlyTemps)
  const warmestMonth = Math.max(...monthlyTemps)
  const warmMonths   = monthlyTemps.filter(t => t >= 10).length
  const dryestMonth  = Math.min(...monthlyPrecips)
  const wettest      = Math.max(...monthlyPrecips)
  const summerHemi   = lat >= 0 ? [3,4,5,6,7,8] : [9,10,11,0,1,2]
  const winterHemi   = lat >= 0 ? [9,10,11,0,1,2] : [3,4,5,6,7,8]
  const summerPrecip = summerHemi.reduce((s, i) => s + monthlyPrecips[i], 0)
  const winterPrecip = winterHemi.reduce((s, i) => s + monthlyPrecips[i], 0)

  // Group E — Polar
  if (warmestMonth < 10) {
    if (warmestMonth < 0) return { code: 'EF', label: 'Polar: Hielo perpetuo', desc: 'Temperatura siempre bajo cero. Capa de hielo permanente.', color: '#b0c4de', main: 'E', sub: 'F', chars: ['Hielo permanente','Sin estaciones cálidas','Precipitación nívea'], seasonality: 'Sin verano' }
    return { code: 'ET', label: 'Polar: Tundra', desc: 'Veranos muy cortos. Solo musgo y líquenes.', color: '#9db8d2', main: 'E', sub: 'T', chars: ['Permafrost','Verano < 4 meses','Vegetación rasa'], seasonality: 'Verano muy corto' }
  }

  // Group B — Dry
  const precipThreshold = coldestMonth < -3
    ? annualTemp * 20
    : winterPrecip / summerPrecip < 0.33
    ? annualTemp * 20 + 280
    : summerPrecip / winterPrecip < 0.33
    ? annualTemp * 20 + 140
    : annualTemp * 20 + 140
  if (annualPrecip < precipThreshold) {
    if (annualPrecip < precipThreshold / 2) {
      if (annualTemp >= 18) return { code: 'BWh', label: 'Árido caliente', desc: 'Desierto caliente. Precipitación < 50% umbral.', color: '#f5c518', main: 'B', sub: 'Wh', chars: ['Sin lluvia efectiva','Alta evapotranspiración','Vegetación escasa'], seasonality: 'Seco todo el año' }
      return { code: 'BWk', label: 'Árido frío', desc: 'Desierto frío. Precipitación muy baja todo el año.', color: '#d4a017', main: 'B', sub: 'Wk', chars: ['Inviernos fríos','Veranos secos','Alta amplitud térmica'], seasonality: 'Seco todo el año' }
    }
    if (annualTemp >= 18) return { code: 'BSh', label: 'Semiárido caliente', desc: 'Estepa caliente. Precipitación escasa.', color: '#e8c84b', main: 'B', sub: 'Sh', chars: ['Lluvias erráticas','Pastizales secos','Riesgo de sequía'], seasonality: 'Lluvias variables' }
    return { code: 'BSk', label: 'Semiárido frío', desc: 'Estepa fría. Inviernos fríos y secos.', color: '#d4b84b', main: 'B', sub: 'Sk', chars: ['Inviernos helados','Pastizales','Poca nubosidad'], seasonality: 'Seco con inviernos fríos' }
  }

  // Group A — Tropical
  if (coldestMonth >= 18) {
    if (dryestMonth >= 60) return { code: 'Af', label: 'Tropical lluvioso', desc: 'Lluvia todo el año > 60 mm/mes. Sin estación seca.', color: '#00a86b', main: 'A', sub: 'f', chars: ['Sin estación seca','Alta biodiversidad','Selva tropical'], seasonality: 'Lluvioso todo el año' }
    if (annualPrecip >= 25 * (100 - dryestMonth)) return { code: 'Am', label: 'Tropical monzónico', desc: 'Monzón con breve estación seca compensada.', color: '#00c896', main: 'A', sub: 'm', chars: ['Monzón intenso','Breve temporada seca','Selva densa'], seasonality: 'Monzón' }
    return { code: 'Aw', label: 'Tropical con estación seca', desc: 'Invierno seco marcado. Sabana tropical.', color: '#56c400', main: 'A', sub: 'w', chars: ['Invierno seco','Sabana','Lluvias veraniegas'], seasonality: 'Seco en invierno' }
  }

  // Group C — Temperate
  if (coldestMonth >= -3 && warmestMonth >= 10) {
    const wetSummer = summerPrecip > winterPrecip * 10
    const drySummer = winterPrecip > summerPrecip * 3 && dryestMonth < 40
    const sub2 = wetSummer ? 'w' : drySummer ? 's' : 'f'
    const warm3rd = warmMonths >= 4 ? 'a' : 'b'
    if (sub2 === 's') return { code: `Cs${warm3rd}`, label: `Mediterráneo ${warm3rd === 'a' ? 'cálido' : 'suave'}`, desc: 'Veranos secos y calurosos. Inviernos lluviosos y suaves.', color: '#f4a261', main: 'C', sub: `s${warm3rd}`, chars: ['Verano seco','Invierno lluvioso','Olivo, viña, mediterráneo'], seasonality: 'Seco en verano' }
    if (sub2 === 'w') return { code: `Cw${warm3rd}`, label: 'Subtropical húmedo-seco', desc: 'Monzón: verano húmedo, invierno seco.', color: '#e07b39', main: 'C', sub: `w${warm3rd}`, chars: ['Verano húmedo','Invierno seco','Bosque mixto'], seasonality: 'Húmedo en verano' }
    return { code: `Cf${warm3rd}`, label: `Oceánico ${warm3rd === 'a' ? 'húmedo' : 'suave'}`, desc: 'Lluvias distribuidas. Sin estación seca marcada.', color: '#52b788', main: 'C', sub: `f${warm3rd}`, chars: ['Lluvias todo el año','Temperaturas moderadas','Bosque caducifolio'], seasonality: 'Lluvioso todo el año' }
  }

  // Group D — Continental
  if (coldestMonth < -3 && warmestMonth >= 10) {
    const sub2 = summerPrecip > winterPrecip * 10 ? 'w' : winterPrecip > summerPrecip * 3 ? 's' : 'f'
    const warm3rd = warmMonths >= 4 ? 'a' : warmMonths >= 1 ? 'b' : coldestMonth < -38 ? 'd' : 'c'
    return { code: `D${sub2}${warm3rd}`, label: `Continental ${warm3rd === 'a' ? 'cálido' : warm3rd === 'b' ? 'suave' : 'severo'}`, desc: 'Inviernos fríos intensos. Gran amplitud térmica anual.', color: '#4a90d9', main: 'D', sub: `${sub2}${warm3rd}`, chars: ['Nieve invernal','Veranos cálidos','Bosque boreal/templado'], seasonality: sub2 === 'w' ? 'Seco en invierno' : sub2 === 's' ? 'Seco en verano' : 'Lluvioso todo el año' }
  }

  return { code: '?', label: 'Indefinido', desc: 'No clasificable con datos disponibles.', color: '#888', main: '?', sub: '?', chars: [], seasonality: 'Desconocida' }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const end = new Date()
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=${fmt(start)}&end_date=${fmt(end)}&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const dailyTimes: string[] = raw.daily?.time ?? []
  const dailyMax: number[]   = raw.daily?.temperature_2m_max ?? []
  const dailyMin: number[]   = raw.daily?.temperature_2m_min ?? []
  const dailyPrecip: number[] = raw.daily?.precipitation_sum ?? []

  const monthlyTemps: number[]   = Array(12).fill(0)
  const monthlyPrecips: number[] = Array(12).fill(0)
  const monthlyCounts: number[]  = Array(12).fill(0)

  dailyTimes.forEach((t, i) => {
    const m = new Date(t).getMonth()
    const avg = ((dailyMax[i] ?? 15) + (dailyMin[i] ?? 10)) / 2
    monthlyTemps[m]   += avg
    monthlyPrecips[m] += dailyPrecip[i] ?? 0
    monthlyCounts[m]  += 1
  })

  const avgMonthlyTemps   = monthlyTemps.map((s, m) => monthlyCounts[m] > 0 ? Math.round(s / monthlyCounts[m] * 10) / 10 : 15)
  const totalMonthlyPrecp = monthlyPrecips.map(s => Math.round(s * 10) / 10)

  const annualTemp   = Math.round(avgMonthlyTemps.reduce((s, t) => s + t, 0) / 12 * 10) / 10
  const annualPrecip = Math.round(totalMonthlyPrecp.reduce((s, p) => s + p, 0))

  const dryestIdx  = totalMonthlyPrecp.indexOf(Math.min(...totalMonthlyPrecp))
  const wettestIdx = totalMonthlyPrecp.indexOf(Math.max(...totalMonthlyPrecp))

  const zone = koppenClassify(annualTemp, annualPrecip, avgMonthlyTemps, totalMonthlyPrecp, parseFloat(lat))

  return NextResponse.json({
    koppen: zone.code,
    koppenLabel: zone.label,
    koppenDesc: zone.desc,
    koppenColor: zone.color,
    mainGroup: zone.main,
    subType: zone.sub,
    characteristics: zone.chars,
    seasonality: zone.seasonality,
    annualTemp,
    annualPrecip,
    dryMonth: annualPrecip > 0 ? MONTH_LABELS[dryestIdx] : null,
    wetMonth: MONTH_LABELS[wettestIdx],
    monthlyTemp: avgMonthlyTemps.map((v, i) => ({ month: MONTH_LABELS[i], value: v })),
    monthlyPrecip: totalMonthlyPrecp.map((v, i) => ({ month: MONTH_LABELS[i], value: v })),
  } satisfies ClimateZoneData)
}
