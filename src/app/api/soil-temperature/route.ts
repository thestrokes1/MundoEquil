import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface SoilTemperatureData {
  surface: number
  depth6cm: number
  depth18cm: number
  depth54cm: number
  frostDepth: number | null
  soilState: 'frozen' | 'cold' | 'cool' | 'optimal' | 'warm' | 'hot'
  germinationRisk: boolean
  cropAdvice: string
  hours: SoilTempHour[]
  days: SoilTempDay[]
}

export interface SoilTempHour {
  hour: string
  surface: number
  depth6: number
  depth18: number
}

export interface SoilTempDay {
  label: string
  avgSurface: number
  minSurface: number
  maxSurface: number
  state: SoilTemperatureData['soilState']
}

function soilState(t: number): SoilTemperatureData['soilState'] {
  if (t < 0)   return 'frozen'
  if (t < 8)   return 'cold'
  if (t < 12)  return 'cool'
  if (t < 25)  return 'optimal'
  if (t < 32)  return 'warm'
  return 'hot'
}

function cropAdvice(surface: number, depth6: number, depth18: number): string {
  if (surface < 0)  return 'Suelo congelado — no arar ni sembrar'
  if (surface < 5)  return 'Suelo muy frío — actividad microbiana mínima'
  if (surface < 10) return 'Fresco para germinación — esperar semanas más cálidas'
  if (surface < 15) return 'Temperatura aceptable para siembra de cultivos fríos'
  if (surface < 25) return 'Temperatura óptima para la mayoría de cultivos'
  if (surface < 32) return 'Suelo caliente — riesgo de estrés radicular'
  return 'Suelo muy caliente — irrigar y usar mulch para proteger raíces'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times: string[] = raw.hourly?.time ?? []
  const s0: number[]   = raw.hourly?.soil_temperature_0cm ?? []
  const s6: number[]   = raw.hourly?.soil_temperature_6cm ?? []
  const s18: number[]  = raw.hourly?.soil_temperature_18cm ?? []
  const s54: number[]  = raw.hourly?.soil_temperature_54cm ?? []

  const hours: SoilTempHour[] = times.slice(0, 48).map((t, i) => ({
    hour: t.slice(11, 16),
    surface: Math.round((s0[i] ?? 15) * 10) / 10,
    depth6:  Math.round((s6[i] ?? 14) * 10) / 10,
    depth18: Math.round((s18[i] ?? 13) * 10) / 10,
  }))

  const surf0  = Math.round((s0[0]  ?? 15) * 10) / 10
  const dep6   = Math.round((s6[0]  ?? 14) * 10) / 10
  const dep18  = Math.round((s18[0] ?? 13) * 10) / 10
  const dep54  = Math.round((s54[0] ?? 12) * 10) / 10

  const frostDepth = surf0 <= 0 ? (dep6 <= 0 ? (dep18 <= 0 ? 18 : 6) : 0) : null

  const dailyTimes: string[]  = raw.daily?.time ?? []
  const dailyMax: number[]    = raw.daily?.temperature_2m_max ?? []
  const dailyMin: number[]    = raw.daily?.temperature_2m_min ?? []

  const days: SoilTempDay[] = dailyTimes.slice(0, 7).map((date, i) => {
    const maxT = Math.round((dailyMax[i] ?? 15) * 10) / 10
    const minT = Math.round((dailyMin[i] ?? 10) * 10) / 10
    const avg  = Math.round((maxT + minT) / 2 * 10) / 10
    return {
      label: new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      avgSurface: avg,
      minSurface: minT,
      maxSurface: maxT,
      state: soilState(avg),
    }
  })

  return NextResponse.json({
    surface: surf0,
    depth6cm: dep6,
    depth18cm: dep18,
    depth54cm: dep54,
    frostDepth,
    soilState: soilState(surf0),
    germinationRisk: surf0 < 10,
    cropAdvice: cropAdvice(surf0, dep6, dep18),
    hours,
    days,
  } satisfies SoilTemperatureData)
}
