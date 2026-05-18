import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface PrecipTypeDetailData {
  current: PrecipEvent
  next24h: PrecipEvent[]
  totalRain: number
  totalSnow: number
  snowDepthCm: number
  freezingRainRisk: boolean
  sleetRisk: boolean
  days: PrecipTypeDay[]
}

export interface PrecipEvent {
  hour: string
  type: 'none' | 'rain' | 'drizzle' | 'snow' | 'sleet' | 'freezing_rain' | 'hail'
  intensity: 'none' | 'trace' | 'light' | 'moderate' | 'heavy' | 'violent'
  amount: number
  snowAmount: number
  temp: number
  emoji: string
  description: string
  color: string
}

export interface PrecipTypeDay {
  label: string
  rainMm: number
  snowCm: number
  primaryType: PrecipEvent['type']
  color: string
}

const TYPE_META: Record<PrecipEvent['type'], { emoji: string; color: string; label: string }> = {
  none:          { emoji: '✅', color: '#22c55e', label: 'Sin precipitación' },
  drizzle:       { emoji: '🌦️', color: '#7dd3fc', label: 'Llovizna' },
  rain:          { emoji: '🌧️', color: '#38bdf8', label: 'Lluvia' },
  snow:          { emoji: '❄️', color: '#e2e8f0', label: 'Nieve' },
  sleet:         { emoji: '🌨️', color: '#a5b4fc', label: 'Aguanieve' },
  freezing_rain: { emoji: '🧊', color: '#818cf8', label: 'Lluvia engelante' },
  hail:          { emoji: '🧿', color: '#fb923c', label: 'Granizo' },
}

const INTENSITY_LABEL: Record<PrecipEvent['intensity'], string> = {
  none:     '',
  trace:    'trazas',
  light:    'débil',
  moderate: 'moderada',
  heavy:    'fuerte',
  violent:  'violenta',
}

function precipType(temp: number, precip: number, snow: number, cape: number): PrecipEvent['type'] {
  if (precip === 0 && snow === 0) return 'none'
  if (cape > 1500 && precip > 2) return 'hail'
  if (temp < -2 && precip > 0)   return 'snow'
  if (temp >= -2 && temp <= 2 && precip > 0) return 'sleet'
  if (temp > 2 && temp <= 4 && precip > 0) return 'freezing_rain'
  if (precip > 0 && precip < 0.3) return 'drizzle'
  if (precip > 0) return 'rain'
  if (snow > 0) return 'snow'
  return 'none'
}

function precipIntensity(amount: number, type: PrecipEvent['type']): PrecipEvent['intensity'] {
  if (amount === 0) return 'none'
  const isSnow = type === 'snow'
  const mm = isSnow ? amount * 10 : amount
  if (mm < 0.1)  return 'trace'
  if (mm < 2.5)  return 'light'
  if (mm < 10)   return 'moderate'
  if (mm < 50)   return 'heavy'
  return 'violent'
}

function eventDescription(type: PrecipEvent['type'], intensity: PrecipEvent['intensity']): string {
  const t = TYPE_META[type].label
  const i = INTENSITY_LABEL[intensity]
  return i ? `${t} ${i}` : t
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,snowfall,cape&daily=precipitation_sum,snowfall_sum&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times: string[]   = raw.hourly?.time ?? []
  const temps: number[]   = raw.hourly?.temperature_2m ?? []
  const precips: number[] = raw.hourly?.precipitation ?? []
  const snows: number[]   = raw.hourly?.snowfall ?? []
  const capes: number[]   = raw.hourly?.cape ?? []

  const events: PrecipEvent[] = times.slice(0, 48).map((t, i) => {
    const temp   = temps[i] ?? 15
    const precip = precips[i] ?? 0
    const snow   = snows[i] ?? 0
    const cape   = capes[i] ?? 0
    const type   = precipType(temp, precip, snow, cape)
    const amount = type === 'snow' ? snow : precip
    const intens = precipIntensity(amount, type)
    const meta   = TYPE_META[type]
    return {
      hour: t.slice(11, 16),
      type,
      intensity: intens,
      amount: Math.round(precip * 10) / 10,
      snowAmount: Math.round(snow * 10) / 10,
      temp: Math.round(temp * 10) / 10,
      emoji: meta.emoji,
      description: eventDescription(type, intens),
      color: meta.color,
    }
  })

  const h24         = events.slice(0, 24)
  const totalRain   = Math.round(h24.reduce((s, e) => s + e.amount, 0) * 10) / 10
  const totalSnow   = Math.round(h24.reduce((s, e) => s + e.snowAmount, 0) * 10) / 10
  const snowDepthCm = Math.round(totalSnow * 10)
  const frzRisk     = h24.some(e => e.type === 'freezing_rain')
  const sleetRisk   = h24.some(e => e.type === 'sleet')

  const dailyTimes: string[]  = raw.daily?.time ?? []
  const dailyRain: number[]   = raw.daily?.precipitation_sum ?? []
  const dailySnow: number[]   = raw.daily?.snowfall_sum ?? []

  const days: PrecipTypeDay[] = dailyTimes.slice(0, 7).map((date, i) => {
    const rain = Math.round((dailyRain[i] ?? 0) * 10) / 10
    const snow = Math.round((dailySnow[i] ?? 0) * 10) / 10
    const type = snow > rain / 5 ? 'snow' : rain > 0 ? 'rain' : 'none'
    return {
      label: new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      rainMm: rain,
      snowCm: Math.round(snow * 10),
      primaryType: type as PrecipEvent['type'],
      color: TYPE_META[type as PrecipEvent['type']].color,
    }
  })

  return NextResponse.json({
    current: events[0] ?? {
      hour: '00:00', type: 'none' as const, intensity: 'none' as const,
      amount: 0, snowAmount: 0, temp: 20, emoji: '✅', description: 'Sin precipitación', color: '#22c55e',
    },
    next24h: events.slice(0, 24),
    totalRain,
    totalSnow,
    snowDepthCm,
    freezingRainRisk: frzRisk,
    sleetRisk,
    days,
  } satisfies PrecipTypeDetailData)
}
