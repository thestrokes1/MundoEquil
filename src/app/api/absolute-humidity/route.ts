import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface AbsoluteHumidityData {
  current: HumidityMoment
  hours: HumidityMoment[]
  daily: HumidityDay[]
  condensationRisk: boolean
  condensationNote: string
}

export interface HumidityMoment {
  time: string
  hour: string
  tempC: number
  rh: number
  dewPoint: number
  absHumidity: number
  mixingRatio: number
  vaporPressure: number
  satVaporPressure: number
}

export interface HumidityDay {
  date: string
  label: string
  avgAbsHumidity: number
  maxAbsHumidity: number
  avgMixingRatio: number
}

// Tetens formula: saturation vapor pressure (hPa)
function satVaporPressure(t: number): number {
  return 6.1078 * Math.exp(17.27 * t / (t + 237.3))
}

// Absolute humidity (g/m³)
function absHumidity(t: number, rh: number): number {
  const esat = satVaporPressure(t)
  const e = (rh / 100) * esat
  return (216.7 * e) / (t + 273.15)
}

// Mixing ratio (g/kg)
function mixingRatio(t: number, rh: number, p: number): number {
  const esat = satVaporPressure(t)
  const e = (rh / 100) * esat
  return 621.97 * e / (p - e)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,surface_pressure&daily=temperature_2m_mean,relative_humidity_2m_mean&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: HumidityMoment[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const temp = raw.hourly.temperature_2m?.[i] ?? 20
    const rh = raw.hourly.relative_humidity_2m?.[i] ?? 60
    const dp = raw.hourly.dew_point_2m?.[i] ?? 10
    const p = raw.hourly.surface_pressure?.[i] ?? 1013
    const esat = satVaporPressure(temp)
    const e = (rh / 100) * esat
    const ah = absHumidity(temp, rh)
    const mr = mixingRatio(temp, rh, p)
    return {
      time: t,
      hour: t.slice(11, 16),
      tempC: Math.round(temp * 10) / 10,
      rh: Math.round(rh),
      dewPoint: Math.round(dp * 10) / 10,
      absHumidity: Math.round(ah * 10) / 10,
      mixingRatio: Math.round(mr * 10) / 10,
      vaporPressure: Math.round(e * 100) / 100,
      satVaporPressure: Math.round(esat * 100) / 100,
    }
  })

  const daily: HumidityDay[] = (raw.daily?.time ?? []).map((d: string, i: number) => {
    const t = raw.daily.temperature_2m_mean?.[i] ?? 20
    const rh = raw.daily.relative_humidity_2m_mean?.[i] ?? 60
    const ah = absHumidity(t, rh)
    const mr = mixingRatio(t, rh, 1013)
    return {
      date: d,
      label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      avgAbsHumidity: Math.round(ah * 10) / 10,
      maxAbsHumidity: Math.round(ah * 1.3 * 10) / 10,
      avgMixingRatio: Math.round(mr * 10) / 10,
    }
  })

  const current = hours[0]
  const condensationRisk = current.rh >= 90 || Math.abs(current.tempC - current.dewPoint) <= 2
  const condensationNote = condensationRisk
    ? `T-Td = ${(current.tempC - current.dewPoint).toFixed(1)}°C — riesgo de condensación`
    : `T-Td = ${(current.tempC - current.dewPoint).toFixed(1)}°C — sin riesgo inmediato`

  return NextResponse.json({
    current,
    hours,
    daily,
    condensationRisk,
    condensationNote,
  } satisfies AbsoluteHumidityData)
}
