import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface AirMassData {
  massType: AirMassType
  origin: string
  characteristics: string[]
  temp: number
  dewpoint: number
  humidity: number
  stability: 'very_stable' | 'stable' | 'neutral' | 'unstable' | 'very_unstable'
  stabilityLabel: string
  mixingHeight: number
  hours: AirMassHour[]
}

export type AirMassType = 'cA' | 'cP' | 'cT' | 'mP' | 'mT' | 'mE' | 'cAA'

export interface AirMassHour {
  hour: string
  massType: AirMassType
  color: string
  temp: number
  humidity: number
}

const MASS_CONFIG: Record<AirMassType, { label: string; color: string; desc: string }> = {
  cA:  { label: 'cA — Ártico continental',     color: '#a5b4fc', desc: 'Masa ártica continental: extremadamente fría y seca' },
  cAA: { label: 'cAA — Antártico',             color: '#7c3aed', desc: 'Masa antártica: la más fría del planeta' },
  cP:  { label: 'cP — Polar continental',      color: '#38bdf8', desc: 'Masa polar continental: fría y seca' },
  mP:  { label: 'mP — Polar marítima',         color: '#34d399', desc: 'Masa polar marítima: fría y húmeda' },
  cT:  { label: 'cT — Tropical continental',   color: '#f97316', desc: 'Masa tropical continental: caliente y seca' },
  mT:  { label: 'mT — Tropical marítima',      color: '#fbbf24', desc: 'Masa tropical marítima: cálida y húmeda' },
  mE:  { label: 'mE — Ecuatorial marítima',    color: '#ef4444', desc: 'Masa ecuatorial: muy caliente y muy húmeda' },
}

function classifyAirMass(temp: number, humidity: number, dewpoint: number, lat: number): AirMassType {
  const absLat = Math.abs(lat)
  const spread = temp - dewpoint
  const moist = spread < 5

  if (absLat > 70)     return temp < -20 ? 'cAA' : 'cA'
  if (absLat > 50)     return moist ? 'mP' : 'cP'
  if (absLat > 30)     return moist ? 'mP' : temp > 25 ? 'cT' : 'cP'
  if (temp > 27 && humidity > 70) return 'mE'
  if (temp > 22 && moist) return 'mT'
  if (temp > 22)       return 'cT'
  if (moist)           return 'mP'
  return 'cP'
}

function stability(cape: number, li: number): AirMassData['stability'] {
  if (cape > 2000 || li < -6) return 'very_unstable'
  if (cape > 500  || li < -2) return 'unstable'
  if (cape > 100  || li < 1)  return 'neutral'
  if (li > 4)                  return 'very_stable'
  return 'stable'
}

function stabilityLabel(s: AirMassData['stability']): string {
  const map = { very_stable: 'Muy estable', stable: 'Estable', neutral: 'Neutral', unstable: 'Inestable', very_unstable: 'Muy inestable' }
  return map[s]
}

function characteristics(type: AirMassType, temp: number, humidity: number): string[] {
  const chars: string[] = [MASS_CONFIG[type].desc]
  if (humidity > 80) chars.push('Alta humedad relativa — niebla o nubosidad posible')
  if (humidity < 30) chars.push('Aire seco — riesgo de incendio forestal elevado')
  if (temp > 35)     chars.push('Temperatura extrema — precaución por calor')
  if (temp < 0)      chars.push('Temperatura bajo cero — riesgo de helada')
  return chars
}

function mixingHeight(cape: number, temp: number, dewpoint: number): number {
  const thermalBase = Math.max(0, (temp - dewpoint) / 8 * 1000)
  const convective  = cape > 0 ? Math.min(3000, cape / 3) : 500
  return Math.round(Math.max(thermalBase, convective))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,dew_point_2m,relative_humidity_2m,cape,lifted_index&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const latNum = parseFloat(lat)
  const times: string[] = raw.hourly?.time ?? []
  const temps: number[] = raw.hourly?.temperature_2m ?? []
  const dps: number[]   = raw.hourly?.dew_point_2m ?? []
  const rhs: number[]   = raw.hourly?.relative_humidity_2m ?? []
  const capes: number[] = raw.hourly?.cape ?? []
  const lis: number[]   = raw.hourly?.lifted_index ?? []

  const hours: AirMassHour[] = times.slice(0, 48).map((t, i) => {
    const temp = temps[i] ?? 15
    const dp   = dps[i]   ?? 10
    const rh   = rhs[i]   ?? 60
    const type = classifyAirMass(temp, rh, dp, latNum)
    return {
      hour: t.slice(11, 16),
      massType: type,
      color: MASS_CONFIG[type].color,
      temp: Math.round(temp * 10) / 10,
      humidity: Math.round(rh),
    }
  })

  const temp0 = temps[0] ?? 15
  const dp0   = dps[0]   ?? 10
  const rh0   = rhs[0]   ?? 60
  const cape0 = capes[0] ?? 0
  const li0   = lis[0]   ?? 0
  const type0 = classifyAirMass(temp0, rh0, dp0, latNum)
  const stab  = stability(cape0, li0)

  return NextResponse.json({
    massType: type0,
    origin: MASS_CONFIG[type0].label,
    characteristics: characteristics(type0, temp0, rh0),
    temp: Math.round(temp0 * 10) / 10,
    dewpoint: Math.round(dp0 * 10) / 10,
    humidity: Math.round(rh0),
    stability: stab,
    stabilityLabel: stabilityLabel(stab),
    mixingHeight: mixingHeight(cape0, temp0, dp0),
    hours,
  } satisfies AirMassData)
}
