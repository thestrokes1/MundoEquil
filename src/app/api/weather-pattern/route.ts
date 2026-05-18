import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface WeatherPatternData {
  pattern: WeatherPatternType
  trend: 'improving' | 'stable' | 'deteriorating'
  trendLabel: string
  pressureHPa: number
  pressureChange3h: number
  pressureChange24h: number
  windBacking: boolean
  frontPassage: boolean
  frontType: 'cold' | 'warm' | 'occluded' | null
  synopsis: string
  hours: PatternHour[]
}

export type WeatherPatternType = 'anticyclone' | 'ridge' | 'trough' | 'cyclone' | 'frontal' | 'cutoff_low' | 'thermal_low'

export interface PatternHour {
  hour: string
  pressure: number
  cloud: number
  wind: number
  precip: number
}

const PATTERN_META: Record<WeatherPatternType, { label: string; color: string; icon: string }> = {
  anticyclone: { label: 'Anticiclón',    color: '#22c55e', icon: '⬆️' },
  ridge:       { label: 'Dorsal alta',   color: '#84cc16', icon: '↗️' },
  trough:      { label: 'Vaguada',       color: '#eab308', icon: '↘️' },
  cyclone:     { label: 'Ciclón',        color: '#ef4444', icon: '🌀' },
  frontal:     { label: 'Paso frontal',  color: '#38bdf8', icon: '➡️' },
  cutoff_low:  { label: 'Gota fría',     color: '#f97316', icon: '💧' },
  thermal_low: { label: 'Baja térmica',  color: '#fb923c', icon: '🔥' },
}

function classifyPattern(
  pressure: number,
  pressureChange: number,
  wind: number,
  cloud: number,
  precip: number,
  temp: number,
): WeatherPatternType {
  if (pressureChange < -3) {
    if (cloud > 70 && precip > 0) return 'frontal'
    if (pressureChange < -6) return 'cyclone'
    return 'trough'
  }
  if (pressureChange > 2) {
    if (cloud < 30) return 'anticyclone'
    return 'ridge'
  }
  if (pressure < 1005 && cloud > 70 && precip > 2) return 'cutoff_low'
  if (pressure < 1010 && temp > 30 && wind < 15) return 'thermal_low'
  if (cloud < 40 && pressure > 1015) return 'anticyclone'
  return 'ridge'
}

function frontType(pressureChange: number, cloud: number, precip: number, windBacking: boolean): WeatherPatternData['frontType'] {
  if (pressureChange < -3 && cloud > 60) {
    if (windBacking) return 'warm'
    if (precip > 1) return 'cold'
    return 'occluded'
  }
  return null
}

function synopsis(pattern: WeatherPatternType, front: WeatherPatternData['frontType'], pressure: number, trend: WeatherPatternData['trend']): string {
  const meta = PATTERN_META[pattern]
  let s = `${meta.icon} ${meta.label}: `
  if (pattern === 'anticyclone') s += 'Tiempo estable, cielos despejados y vientos débiles.'
  else if (pattern === 'ridge') s += 'Dorsal anticiclónica — buen tiempo con nubosidad variable.'
  else if (pattern === 'trough') s += 'Vaguada en niveles medios — tiempo inestable, posibles chubascos.'
  else if (pattern === 'cyclone') s += 'Baja presión activa — tiempo perturbado con precipitaciones.'
  else if (pattern === 'frontal' && front === 'cold') s += 'Frente frío en aproximación — descenso térmico y chubascos.'
  else if (pattern === 'frontal' && front === 'warm') s += 'Frente cálido — nubosidad espesa y lluvia persistente.'
  else if (pattern === 'cutoff_low') s += 'Gota fría (DANA) — precipitaciones intensas y erráticas.'
  else if (pattern === 'thermal_low') s += 'Baja térmica — ambiente seco y caluroso, tormentas locales.'
  else s += 'Situación meteorológica de transición.'
  if (trend === 'deteriorating') s += ' Empeoramiento esperado.'
  if (trend === 'improving') s += ' Mejoría en camino.'
  return s
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,precipitation,temperature_2m&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times: string[]   = raw.hourly?.time ?? []
  const pres: number[]    = raw.hourly?.surface_pressure ?? []
  const clouds: number[]  = raw.hourly?.cloud_cover ?? []
  const winds: number[]   = raw.hourly?.wind_speed_10m ?? []
  const wdirs: number[]   = raw.hourly?.wind_direction_10m ?? []
  const precips: number[] = raw.hourly?.precipitation ?? []
  const temps: number[]   = raw.hourly?.temperature_2m ?? []

  const hours: PatternHour[] = times.slice(0, 48).map((t, i) => ({
    hour: t.slice(11, 16),
    pressure: Math.round((pres[i] ?? 1013) * 10) / 10,
    cloud: Math.round(clouds[i] ?? 30),
    wind: Math.round(winds[i] ?? 10),
    precip: Math.round((precips[i] ?? 0) * 10) / 10,
  }))

  const p0  = pres[0] ?? 1013
  const p3  = pres[3] ?? p0
  const p24 = pres[24] ?? p0
  const pc3  = Math.round((p0 - p3)  * 10) / 10
  const pc24 = Math.round((p0 - p24) * 10) / 10

  // Check wind backing (direction decreasing → warm front)
  const wd0 = wdirs[0] ?? 270
  const wd6 = wdirs[6] ?? wd0
  const windBacking = wd6 < wd0

  const pattern = classifyPattern(p0, pc3, winds[0] ?? 10, clouds[0] ?? 30, precips[0] ?? 0, temps[0] ?? 15)
  const front   = frontType(pc3, clouds[0] ?? 30, precips[0] ?? 0, windBacking)
  const trend: WeatherPatternData['trend'] = pc3 < -2 ? 'deteriorating' : pc3 > 1.5 ? 'improving' : 'stable'

  return NextResponse.json({
    pattern,
    trend,
    trendLabel: trend === 'deteriorating' ? 'Empeorando' : trend === 'improving' ? 'Mejorando' : 'Estable',
    pressureHPa: Math.round(p0 * 10) / 10,
    pressureChange3h: pc3,
    pressureChange24h: pc24,
    windBacking,
    frontPassage: front !== null,
    frontType: front,
    synopsis: synopsis(pattern, front, p0, trend),
    hours,
  } satisfies WeatherPatternData)
}
