import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface HumidityForecastData {
  currentHumidity: number
  dewPoint: number
  absoluteHumidity: number
  vaporPressure: number
  saturationVP: number
  relativeVP: number
  comfortZone: 'dry' | 'comfortable' | 'humid' | 'oppressive'
  comfortLabel: string
  comfortColor: string
  mold48h: boolean
  moldRisk: string
  hours: HumidityHour[]
  days: HumidityDay[]
}

export interface HumidityHour {
  hour: string
  rh: number
  dewPoint: number
  absoluteHumidity: number
}

export interface HumidityDay {
  label: string
  maxRH: number
  minRH: number
  avgDewPoint: number
  mold: boolean
}

function dewPoint(temp: number, rh: number): number {
  const a = 17.27, b = 237.7
  const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100)
  return Math.round((b * alpha) / (a - alpha) * 10) / 10
}

function absoluteHumidity(temp: number, rh: number): number {
  const es = 6.1078 * Math.exp((17.27 * temp) / (237.3 + temp))
  return Math.round((2165.6 * (es * rh / 100) / (273.15 + temp)) * 10) / 10
}

function saturationVP(temp: number): number {
  return Math.round(6.1078 * Math.exp((17.27 * temp) / (237.3 + temp)) * 10) / 10
}

function comfortZone(rh: number, dp: number): { zone: HumidityForecastData['comfortZone']; label: string; color: string } {
  if (rh < 30 || dp < 5)  return { zone: 'dry',         label: 'Seco — irritación mucosas',  color: '#fbbf24' }
  if (rh < 60 && dp < 16) return { zone: 'comfortable', label: 'Confortable',                color: '#22c55e' }
  if (rh < 75 && dp < 21) return { zone: 'humid',       label: 'Húmedo — algo pegajoso',     color: '#84cc16' }
  return                          { zone: 'oppressive',  label: 'Opresivo — sudoración alta', color: '#f97316' }
}

const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m&daily=relative_humidity_2m_max,relative_humidity_2m_min,temperature_2m_mean&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hTimes: string[]  = raw.hourly?.time ?? []
  const hTemps: number[]  = raw.hourly?.temperature_2m ?? []
  const hRHs:   number[]  = raw.hourly?.relative_humidity_2m ?? []
  const dTimes: string[]  = raw.daily?.time ?? []
  const dMaxRH: number[]  = raw.daily?.relative_humidity_2m_max ?? []
  const dMinRH: number[]  = raw.daily?.relative_humidity_2m_min ?? []
  const dMeanT: number[]  = raw.daily?.temperature_2m_mean ?? []

  const t0  = hTemps[0] ?? 20
  const rh0 = hRHs[0] ?? 60
  const dp0 = dewPoint(t0, rh0)
  const ah0 = absoluteHumidity(t0, rh0)
  const svp = saturationVP(t0)
  const vp  = Math.round(svp * rh0 / 100 * 10) / 10
  const { zone, label, color } = comfortZone(rh0, dp0)

  const mold48h = hRHs.slice(0, 48).filter(rh => rh > 80).length > 8

  const hours: HumidityHour[] = hTimes.slice(0, 48).map((t, i) => {
    const temp = hTemps[i] ?? 20
    const rh   = hRHs[i] ?? 60
    return {
      hour: t.slice(11, 16),
      rh,
      dewPoint: dewPoint(temp, rh),
      absoluteHumidity: absoluteHumidity(temp, rh),
    }
  })

  const days: HumidityDay[] = dTimes.slice(0, 7).map((t, i) => {
    const maxRH = dMaxRH[i] ?? 70
    const minRH = dMinRH[i] ?? 40
    const avgT  = dMeanT[i] ?? 20
    const avgRH = (maxRH + minRH) / 2
    const d = new Date(t)
    return {
      label: `${d.toLocaleDateString('es-MX', { weekday: 'short' })} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`,
      maxRH,
      minRH,
      avgDewPoint: dewPoint(avgT, avgRH),
      mold: maxRH > 80,
    }
  })

  return NextResponse.json({
    currentHumidity: Math.round(rh0),
    dewPoint: dp0,
    absoluteHumidity: ah0,
    vaporPressure: vp,
    saturationVP: svp,
    relativeVP: Math.round(vp / svp * 100),
    comfortZone: zone,
    comfortLabel: label,
    comfortColor: color,
    mold48h,
    moldRisk: mold48h
      ? 'Riesgo de moho — humedad > 80% por más de 8h en 48h'
      : 'Sin riesgo significativo de moho en 48h',
    hours,
    days,
  } satisfies HumidityForecastData)
}
