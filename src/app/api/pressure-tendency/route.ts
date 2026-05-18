import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface PressurePoint {
  time: string
  pressure: number   // hPa
  tendency: number   // hPa/3h
}

export interface PressureTendencyData {
  points: PressurePoint[]
  current: number
  tendency3h: number      // hPa change over last 3h
  tendency24h: number     // hPa change over last 24h
  forecast: string        // text forecast based on tendency
  changeRate: 'rapid_fall' | 'fall' | 'slow_fall' | 'steady' | 'slow_rise' | 'rise' | 'rapid_rise'
  stormProbability: number  // 0–100
}

function tendencyForecast(t3h: number): {
  text: string
  rate: PressureTendencyData['changeRate']
  stormProb: number
} {
  if (t3h <= -6)   return { text: 'Cambio muy rápido: tormenta inminente, cielos deteriorándose rápidamente', rate: 'rapid_fall', stormProb: 90 }
  if (t3h <= -3.6) return { text: 'Caída rápida: mal tiempo en camino, viento y lluvia esperados', rate: 'fall', stormProb: 70 }
  if (t3h <= -1.6) return { text: 'Caída lenta: deterioro gradual del tiempo en las próximas horas', rate: 'slow_fall', stormProb: 40 }
  if (t3h < 1.6)   return { text: 'Presión estable: tiempo sin cambios significativos esperados', rate: 'steady', stormProb: 10 }
  if (t3h < 3.6)   return { text: 'Subida lenta: mejoría gradual del tiempo', rate: 'slow_rise', stormProb: 5 }
  if (t3h < 6)     return { text: 'Subida rápida: mejoría notable, despejando', rate: 'rise', stormProb: 2 }
  return               { text: 'Subida muy rápida: mejoría extrema, posible viento fuerte frío', rate: 'rapid_rise', stormProb: 15 }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', 'surface_pressure')
  url.searchParams.set('past_days', '2')
  url.searchParams.set('forecast_days', '5')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const json = await res.json()

  const times: string[] = json.hourly?.time ?? []
  const pressure: number[] = json.hourly?.surface_pressure ?? []

  const points: PressurePoint[] = times.map((t, i) => {
    const prev3h = pressure[Math.max(0, i - 3)] ?? pressure[i] ?? 0
    const curr = pressure[i] ?? 0
    return {
      time: t,
      pressure: parseFloat(curr.toFixed(1)),
      tendency: parseFloat((curr - prev3h).toFixed(1)),
    }
  })

  // Current = index at 2*24 = 48 (start of forecast)
  const idx = 48
  const current = pressure[idx] ?? pressure[pressure.length - 1] ?? 1013
  const tendency3h = parseFloat(((pressure[idx] ?? 0) - (pressure[Math.max(0, idx - 3)] ?? 0)).toFixed(1))
  const tendency24h = parseFloat(((pressure[idx] ?? 0) - (pressure[Math.max(0, idx - 24)] ?? 0)).toFixed(1))

  const { text, rate, stormProb } = tendencyForecast(tendency3h)

  return NextResponse.json({
    points,
    current: parseFloat(current.toFixed(1)),
    tendency3h,
    tendency24h,
    forecast: text,
    changeRate: rate,
    stormProbability: stormProb,
  } satisfies PressureTendencyData)
}
