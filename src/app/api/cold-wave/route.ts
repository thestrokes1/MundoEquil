import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface ColdWaveData {
  isActiveColdWave: boolean
  coldWaveDays: number
  minTempToday: number
  minTempAnomaly: number
  windChill: number
  frostRisk: boolean
  pipeRisk: boolean
  snowRisk: boolean
  severity: 'none' | 'advisory' | 'watch' | 'warning' | 'extreme'
  severityLabel: string
  severityColor: string
  advice: string[]
  forecast: ColdWaveDay[]
}

export interface ColdWaveDay {
  label: string
  minTemp: number
  maxTemp: number
  windChill: number
  isColdWave: boolean
}

function windChillC(temp: number, wind: number): number {
  if (temp > 10 || wind < 4.8) return temp
  return Math.round((13.12 + 0.6215 * temp - 11.37 * Math.pow(wind, 0.16) + 0.3965 * temp * Math.pow(wind, 0.16)) * 10) / 10
}

function severity(minTemp: number, anomaly: number): ColdWaveData['severity'] {
  if (minTemp > 0 && anomaly > -5) return 'none'
  if (minTemp > 0 && anomaly <= -5) return 'advisory'
  if (minTemp <= 0 && minTemp > -10) return 'watch'
  if (minTemp <= -10 && minTemp > -20) return 'warning'
  return 'extreme'
}

const SEV_LABELS: Record<ColdWaveData['severity'], string> = {
  none:     'Sin ola de frío',
  advisory: 'Aviso de frío',
  watch:    'Vigilancia de frío',
  warning:  'Alerta de frío',
  extreme:  'Frío extremo',
}
const SEV_COLORS: Record<ColdWaveData['severity'], string> = {
  none:     '#22c55e',
  advisory: '#60a5fa',
  watch:    '#3b82f6',
  warning:  '#1d4ed8',
  extreme:  '#1e3a8a',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const [forecastRes, normRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_min,temperature_2m_max,wind_speed_10m_max,precipitation_sum,snowfall_sum&forecast_days=7&timezone=auto`,
      { next: { revalidate } }
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_min&past_days=30&forecast_days=0&timezone=auto`,
      { next: { revalidate } }
    ),
  ])

  if (!forecastRes.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

  const forecast = await forecastRes.json()
  const norm     = normRes.ok ? await normRes.json() : {}

  const dailyMin:   number[] = forecast.daily?.temperature_2m_min ?? []
  const dailyMax:   number[] = forecast.daily?.temperature_2m_max ?? []
  const dailyWind:  number[] = forecast.daily?.wind_speed_10m_max ?? []
  const dailyPrecip:number[] = forecast.daily?.precipitation_sum ?? []
  const dailySnow:  number[] = forecast.daily?.snowfall_sum ?? []
  const dailyTimes: string[] = forecast.daily?.time ?? []

  const pastMins: number[] = norm.daily?.temperature_2m_min ?? []
  const avgNorm  = pastMins.length > 0
    ? pastMins.reduce((s, t) => s + t, 0) / pastMins.length
    : (dailyMin[0] ?? 5)

  const todayMin  = dailyMin[0] ?? 5
  const todayMax  = dailyMax[0] ?? 12
  const todayWind = dailyWind[0] ?? 10
  const anomaly   = Math.round((todayMin - avgNorm) * 10) / 10

  const COLD_THRESHOLD = -3
  const coldWaveDays = dailyMin.filter(t => t < COLD_THRESHOLD).length

  const wc = windChillC(todayMin, todayWind)
  const sev = severity(todayMin, anomaly)

  const advice: string[] = []
  if (todayMin < 0)  advice.push('Proteger tuberías exteriores de agua')
  if (todayMin < -5) advice.push('Cubrir plantas sensibles y árboles frutales')
  if (wc < -10)      advice.push('Exposición al exterior máx. 30 min — riesgo de congelamiento')
  if (dailySnow[0] > 0) advice.push('Precaución en vialidades — posible hielo y nieve')
  if (todayMin < 5)  advice.push('Revisar calefacción y aislar ventanas')
  if (advice.length === 0) advice.push('Sin riesgos especiales de frío en las próximas horas')

  const forecastDays: ColdWaveDay[] = dailyTimes.slice(0, 7).map((t, i) => {
    const mn = dailyMin[i] ?? 5
    const mx = dailyMax[i] ?? 12
    const wnd = dailyWind[i] ?? 10
    return {
      label: new Date(t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      minTemp: Math.round(mn * 10) / 10,
      maxTemp: Math.round(mx * 10) / 10,
      windChill: windChillC(mn, wnd),
      isColdWave: mn < COLD_THRESHOLD,
    }
  })

  return NextResponse.json({
    isActiveColdWave: sev !== 'none',
    coldWaveDays,
    minTempToday: Math.round(todayMin * 10) / 10,
    minTempAnomaly: anomaly,
    windChill: wc,
    frostRisk: todayMin < 2,
    pipeRisk: todayMin < -4,
    snowRisk: (dailySnow[0] ?? 0) > 0 || (dailyPrecip[0] ?? 0) > 0 && todayMax < 3,
    severity: sev,
    severityLabel: SEV_LABELS[sev],
    severityColor: SEV_COLORS[sev],
    advice,
    forecast: forecastDays,
  } satisfies ColdWaveData)
}
