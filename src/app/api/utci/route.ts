import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface UTCIData {
  utci: number
  category: UTCICategory
  categoryLabel: string
  categoryColor: string
  stressLevel: number
  advice: string
  hours: UTCIHour[]
}

export type UTCICategory =
  | 'extreme_cold_stress'
  | 'very_strong_cold_stress'
  | 'strong_cold_stress'
  | 'moderate_cold_stress'
  | 'slight_cold_stress'
  | 'no_thermal_stress'
  | 'moderate_heat_stress'
  | 'strong_heat_stress'
  | 'very_strong_heat_stress'
  | 'extreme_heat_stress'

export interface UTCIHour {
  hour: string
  utci: number
  category: UTCICategory
}

const CATEGORIES: Record<UTCICategory, { label: string; color: string; stress: number; advice: string }> = {
  extreme_cold_stress:       { label: 'Estrés frío extremo',       color: '#1e3a8a', stress: 10, advice: 'Permanecer en interior, riesgo de congelamiento' },
  very_strong_cold_stress:   { label: 'Estrés frío muy fuerte',    color: '#1d4ed8', stress: 9,  advice: 'Abrigo completo, evitar exposición prolongada' },
  strong_cold_stress:        { label: 'Estrés frío fuerte',        color: '#3b82f6', stress: 7,  advice: 'Capas térmicas, limitar tiempo exterior' },
  moderate_cold_stress:      { label: 'Estrés frío moderado',      color: '#60a5fa', stress: 5,  advice: 'Abrigarse bien, precaución' },
  slight_cold_stress:        { label: 'Estrés frío leve',          color: '#93c5fd', stress: 3,  advice: 'Ropa de abrigo ligera suficiente' },
  no_thermal_stress:         { label: 'Sin estrés térmico',        color: '#22c55e', stress: 0,  advice: 'Condiciones confortables para actividad exterior' },
  moderate_heat_stress:      { label: 'Estrés calor moderado',     color: '#fbbf24', stress: 4,  advice: 'Hidratarse, evitar ejercicio intenso al mediodía' },
  strong_heat_stress:        { label: 'Estrés calor fuerte',       color: '#f97316', stress: 6,  advice: 'Limitar actividad física, sombra y agua' },
  very_strong_heat_stress:   { label: 'Estrés calor muy fuerte',   color: '#ef4444', stress: 8,  advice: 'Evitar exterior, riesgo de golpe de calor' },
  extreme_heat_stress:       { label: 'Estrés calor extremo',      color: '#7f1d1d', stress: 10, advice: 'Permanecer en interior con climatización' },
}

function categorize(utci: number): UTCICategory {
  if (utci < -40) return 'extreme_cold_stress'
  if (utci < -27) return 'very_strong_cold_stress'
  if (utci < -13) return 'strong_cold_stress'
  if (utci < 0)   return 'moderate_cold_stress'
  if (utci < 9)   return 'slight_cold_stress'
  if (utci < 26)  return 'no_thermal_stress'
  if (utci < 32)  return 'moderate_heat_stress'
  if (utci < 38)  return 'strong_heat_stress'
  if (utci < 46)  return 'very_strong_heat_stress'
  return 'extreme_heat_stress'
}

// Fiala simplified UTCI approximation
function computeUTCI(ta: number, tr: number, va: number, rh: number): number {
  const ehPa = (rh / 100) * 6.105 * Math.exp((17.27 * ta) / (237.7 + ta))
  const d_utci =
    -2.7015797 * (ta - 37) +
    0.14611605 * va +
    0.016632960 * tr +
    -0.044228614 * ehPa +
    0.18720228 * Math.pow(ta - 37, 2) +
    -0.035262915 * Math.pow(va, 2)
  return Math.round((ta + d_utci) * 10) / 10
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times: string[]   = raw.hourly?.time ?? []
  const temps: number[]   = raw.hourly?.temperature_2m ?? []
  const rhs: number[]     = raw.hourly?.relative_humidity_2m ?? []
  const winds: number[]   = raw.hourly?.wind_speed_10m ?? []
  const rads: number[]    = raw.hourly?.shortwave_radiation ?? []

  const hours: UTCIHour[] = times.slice(0, 48).map((t, i) => {
    const ta  = temps[i] ?? 20
    const rh  = rhs[i] ?? 50
    const va  = Math.max(0.5, (winds[i] ?? 5) / 3.6)
    const rad = rads[i] ?? 200
    const tr  = ta + 0.5 * rad / 50
    const utci = computeUTCI(ta, tr, va, rh)
    const cat  = categorize(utci)
    return { hour: t.slice(11, 16), utci, category: cat }
  })

  const current  = hours[0]
  const cat      = current.category
  const catData  = CATEGORIES[cat]

  return NextResponse.json({
    utci: current.utci,
    category: cat,
    categoryLabel: catData.label,
    categoryColor: catData.color,
    stressLevel: catData.stress,
    advice: catData.advice,
    hours,
  } satisfies UTCIData)
}
