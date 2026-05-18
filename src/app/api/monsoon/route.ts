import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface MonsoonData {
  isMonsoonal: boolean
  phase: MonsoonPhase
  phaseLabel: string
  phaseColor: string
  onset: string | null
  withdrawal: string | null
  seasonProgress: number
  weeklyPrecip: number
  intensityMm: number
  intensityLabel: string
  advice: string
  dailyForecast: MonsoonDay[]
}

export type MonsoonPhase = 'pre_monsoon' | 'onset' | 'active' | 'break' | 'withdrawal' | 'post_monsoon' | 'dry_season'

export interface MonsoonDay {
  date: string
  label: string
  precip: number
  maxTemp: number
  minTemp: number
  humidity: number
}

function monsoonsPhase(lat: number, monthlyPrecips: number[], currentMonth: number): MonsoonPhase {
  const summerHemi = lat >= 0 ? [5, 6, 7, 8] : [11, 0, 1, 2]
  const summerTotal = summerHemi.reduce((s, m) => s + monthlyPrecips[m], 0)
  const annualTotal = monthlyPrecips.reduce((s, p) => s + p, 0)
  const seasonality = annualTotal > 0 ? summerTotal / annualTotal : 0

  if (seasonality < 0.4) return 'dry_season'

  const isSummerMonth = summerHemi.includes(currentMonth)
  const preMonths = lat >= 0 ? [3, 4] : [9, 10]
  const postMonths = lat >= 0 ? [9, 10] : [3, 4]
  const isPreMonsoon = preMonths.includes(currentMonth)
  const isPostMonsoon = postMonths.includes(currentMonth)

  if (isPreMonsoon) return 'pre_monsoon'
  if (isPostMonsoon) return 'post_monsoon'

  const peak = summerHemi.reduce((best, m) => monthlyPrecips[m] > monthlyPrecips[best] ? m : best, summerHemi[0])
  if (isSummerMonth) {
    const diff = Math.abs(currentMonth - peak)
    if (diff <= 1) return 'active'
    if (currentMonth < peak) return 'onset'
    return 'withdrawal'
  }
  return 'dry_season'
}

const PHASE_LABELS: Record<MonsoonPhase, string> = {
  pre_monsoon:    'Pre-monzón',
  onset:          'Inicio del monzón',
  active:         'Monzón activo',
  break:          'Pausa monzónica',
  withdrawal:     'Retirada del monzón',
  post_monsoon:   'Post-monzón',
  dry_season:     'Estación seca',
}

const PHASE_COLORS: Record<MonsoonPhase, string> = {
  pre_monsoon:    '#fbbf24',
  onset:          '#34d399',
  active:         '#3b82f6',
  break:          '#94a3b8',
  withdrawal:     '#f97316',
  post_monsoon:   '#a78bfa',
  dry_season:     '#d97706',
}

function intensityLabel(mm: number): string {
  if (mm === 0)    return 'Sin lluvia'
  if (mm < 10)     return 'Lluvia débil'
  if (mm < 35)     return 'Lluvia moderada'
  if (mm < 65)     return 'Lluvia fuerte'
  if (mm < 125)    return 'Lluvia muy fuerte'
  return 'Lluvia torrencial'
}

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const [forecastRes, histRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,relative_humidity_2m_max&forecast_days=14&timezone=auto`,
      { next: { revalidate } }
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&past_days=365&forecast_days=0&timezone=auto`,
      { next: { revalidate } }
    ),
  ])

  if (!forecastRes.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

  const forecast = await forecastRes.json()
  const hist     = histRes.ok ? await histRes.json() : {}

  const dailyTimes:  string[]  = forecast.daily?.time ?? []
  const dailyPrecip: number[]  = forecast.daily?.precipitation_sum ?? []
  const dailyMax:    number[]  = forecast.daily?.temperature_2m_max ?? []
  const dailyMin:    number[]  = forecast.daily?.temperature_2m_min ?? []
  const dailyHumid:  number[]  = forecast.daily?.relative_humidity_2m_max ?? []

  const histTimes:  string[]  = hist.daily?.time ?? []
  const histPrecip: number[]  = hist.daily?.precipitation_sum ?? []
  const monthlyPrecips: number[] = Array(12).fill(0)
  const monthlyCounts:  number[] = Array(12).fill(0)
  histTimes.forEach((t, i) => {
    const m = new Date(t).getMonth()
    monthlyPrecips[m] += histPrecip[i] ?? 0
    monthlyCounts[m]  += 1
  })
  const avgMonthlyPrecip = monthlyPrecips.map((s, m) =>
    monthlyCounts[m] > 0 ? s / monthlyCounts[m] * 30 : 0
  )

  const latNum  = parseFloat(lat)
  const today   = new Date()
  const curMonth = today.getMonth()
  const phase   = monsoonsPhase(latNum, avgMonthlyPrecip, curMonth)
  const summerHemi = latNum >= 0 ? [5, 6, 7, 8] : [11, 0, 1, 2]
  const isMonsoonal = summerHemi.reduce((s, m) => s + avgMonthlyPrecip[m], 0) /
    (avgMonthlyPrecip.reduce((s, p) => s + p, 0) || 1) > 0.4

  const weeklyPrecip = dailyPrecip.slice(0, 7).reduce((s, p) => s + (p ?? 0), 0)
  const todayMm      = dailyPrecip[0] ?? 0

  const onsetIdx = summerHemi[0]
  const withIdx  = summerHemi[summerHemi.length - 1]

  const dailyForecast: MonsoonDay[] = dailyTimes.slice(0, 10).map((t, i) => ({
    date: t,
    label: new Date(t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
    precip: Math.round((dailyPrecip[i] ?? 0) * 10) / 10,
    maxTemp: Math.round((dailyMax[i] ?? 25) * 10) / 10,
    minTemp: Math.round((dailyMin[i] ?? 18) * 10) / 10,
    humidity: Math.round(dailyHumid[i] ?? 70),
  }))

  const summerStart = MONTH_LABELS[onsetIdx]
  const summerEnd   = MONTH_LABELS[withIdx]

  const seasonProgress = summerHemi.includes(curMonth)
    ? ((curMonth - summerHemi[0] + 12) % 12) / summerHemi.length
    : 0

  const adviceMap: Record<MonsoonPhase, string> = {
    pre_monsoon:    'Calor y humedad en aumento — preparar drenajes y reservas de agua',
    onset:          'Las primeras lluvias llegan — ideal para siembra, cuidar encharcamientos',
    active:         'Monzón pleno — monitorear crecidas, aprovechar agua para cultivos',
    break:          'Pausa temporal — temperatura sube, humedad alta persiste',
    withdrawal:     'Lluvias menguando — cosechas y preparación post-monzón',
    post_monsoon:   'Temporada seca aproximándose — gestionar reservas hídri­cas',
    dry_season:     'Estación seca — irrigación necesaria para cultivos',
  }

  return NextResponse.json({
    isMonsoonal,
    phase,
    phaseLabel:      PHASE_LABELS[phase],
    phaseColor:      PHASE_COLORS[phase],
    onset:           isMonsoonal ? summerStart : null,
    withdrawal:      isMonsoonal ? summerEnd : null,
    seasonProgress:  Math.round(seasonProgress * 100),
    weeklyPrecip:    Math.round(weeklyPrecip * 10) / 10,
    intensityMm:     Math.round(todayMm * 10) / 10,
    intensityLabel:  intensityLabel(todayMm),
    advice:          adviceMap[phase],
    dailyForecast,
  } satisfies MonsoonData)
}
