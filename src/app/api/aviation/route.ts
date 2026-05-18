import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface AviationData {
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR'
  ceiling: number
  visibility: number
  densityAltitude: number
  crosswind: number
  turbulenceRisk: 'low' | 'moderate' | 'severe' | 'extreme'
  icingRisk: 'nil' | 'trace' | 'light' | 'moderate' | 'severe'
  hours: AviationHour[]
  windShear: number
  pressureAlt: number
}

export interface AviationHour {
  hour: string
  category: 'VFR' | 'MVFR' | 'IFR' | 'LIFR'
  categoryColor: string
  ceiling: number
  visibility: number
  wind: number
  gust: number
  temp: number
  dewpoint: number
  precip: number
}

function flightCategory(cloudBase: number, vis: number): AviationData['flightCategory'] {
  if (cloudBase < 200 || vis < 0.8)  return 'LIFR'
  if (cloudBase < 500 || vis < 3)    return 'IFR'
  if (cloudBase < 1000 || vis < 8)   return 'MVFR'
  return 'VFR'
}

function categoryColor(cat: AviationData['flightCategory']): string {
  if (cat === 'VFR')  return '#22c55e'
  if (cat === 'MVFR') return '#38bdf8'
  if (cat === 'IFR')  return '#f87171'
  return '#a855f7'
}

function cloudBase(temp: number, dewpoint: number): number {
  // Lifted condensation level estimate: every 8°C spread lifts 1000m
  const spread = Math.max(0, temp - dewpoint)
  return Math.round((spread / 8) * 1000)
}

function densityAltitude(elev: number, temp: number, qnh: number): number {
  const pressureAlt = elev + (1013.25 - qnh) * 30
  const isa = 15 - 1.98 * (elev / 304.8)
  return Math.round(pressureAlt + 118.8 * (temp - isa))
}

function turbulenceRisk(wind: number, gust: number, cape: number, cloud: number): AviationData['turbulenceRisk'] {
  const gustFactor = gust - wind
  const score = (gustFactor > 15 ? 2 : gustFactor > 8 ? 1 : 0) + (cape > 1000 ? 2 : cape > 300 ? 1 : 0) + (wind > 30 ? 1 : 0)
  if (score >= 4) return 'extreme'
  if (score >= 3) return 'severe'
  if (score >= 1) return 'moderate'
  return 'low'
}

function icingRisk(temp: number, dewpoint: number, cloud: number, precip: number): AviationData['icingRisk'] {
  const spread = temp - dewpoint
  const inCloud = cloud > 50 && spread < 4
  if (!inCloud && precip === 0) return 'nil'
  if (temp < -20 || temp > 5) return 'trace'
  const severity = (temp >= -10 && temp <= -2 ? 2 : 1) + (precip > 0 ? 1 : 0) + (cloud > 75 ? 1 : 0)
  if (severity >= 4) return 'severe'
  if (severity >= 3) return 'moderate'
  if (severity >= 1) return 'light'
  return 'trace'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,dew_point_2m,cloud_cover,visibility,wind_speed_10m,wind_gusts_10m,precipitation,surface_pressure,cape&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: AviationHour[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const temp = raw.hourly.temperature_2m?.[i] ?? 15
    const dp   = raw.hourly.dew_point_2m?.[i] ?? 10
    const cloud = raw.hourly.cloud_cover?.[i] ?? 30
    const vis  = (raw.hourly.visibility?.[i] ?? 10000) / 1000
    const wind = raw.hourly.wind_speed_10m?.[i] ?? 5
    const gust = raw.hourly.wind_gusts_10m?.[i] ?? wind
    const precip = raw.hourly.precipitation?.[i] ?? 0
    const cb   = cloudBase(temp, dp)
    const cat  = flightCategory(cb, vis)
    return {
      hour: t.slice(11, 16),
      category: cat,
      categoryColor: categoryColor(cat),
      ceiling: cb,
      visibility: Math.round(vis * 10) / 10,
      wind: Math.round(wind),
      gust: Math.round(gust),
      temp: Math.round(temp * 10) / 10,
      dewpoint: Math.round(dp * 10) / 10,
      precip: Math.round(precip * 10) / 10,
    }
  })

  const h0 = hours[0]
  const temp0   = h0?.temp ?? 15
  const dp0     = h0?.dewpoint ?? 10
  const cloud0  = raw.hourly.cloud_cover?.[0] ?? 30
  const wind0   = h0?.wind ?? 5
  const gust0   = h0?.gust ?? wind0
  const precip0 = h0?.precip ?? 0
  const qnh     = raw.hourly.surface_pressure?.[0] ?? 1013
  const cape0   = raw.hourly.cape?.[0] ?? 0
  const elev    = raw.elevation ?? 0
  const cb0     = cloudBase(temp0, dp0)

  const shear = (() => {
    const w1 = raw.hourly.wind_speed_10m?.[0] ?? 0
    const w2 = raw.hourly.wind_speed_10m?.[6] ?? w1
    return Math.abs(w2 - w1)
  })()

  return NextResponse.json({
    flightCategory: flightCategory(cb0, h0?.visibility ?? 10),
    ceiling: cb0,
    visibility: h0?.visibility ?? 10,
    densityAltitude: densityAltitude(elev, temp0, qnh),
    crosswind: Math.round(wind0 * 0.4),
    turbulenceRisk: turbulenceRisk(wind0, gust0, cape0, cloud0),
    icingRisk: icingRisk(temp0, dp0, cloud0, precip0),
    windShear: Math.round(shear),
    pressureAlt: Math.round(elev + (1013.25 - qnh) * 30),
    hours,
  } satisfies AviationData)
}
