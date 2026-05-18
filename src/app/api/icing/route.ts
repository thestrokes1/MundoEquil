import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 1800

export interface IcingData {
  hours: IcingHour[]
  currentIcingProb: number
  currentIcingType: string
  maxIcingProb: number
  icingLayerBase: number
  icingLayerTop: number
  severeHours: number
  peakHour: IcingHour | null
}

export interface IcingHour {
  time: string
  hour: string
  icingProb: number
  icingType: string
  temp: number
  dewpoint: number
  humidity: number
  cloudCover: number
  freezingLvl: number
}

function icingType(temp: number, humidity: number): string {
  if (temp > 0) return 'Ninguno'
  if (temp >= -2) return 'Lluvia engelante'
  if (temp >= -8) return 'Engelamiento claro'
  if (temp >= -15) return 'Mixto'
  if (temp >= -20) return 'Escarcha'
  return 'Mínimo'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const params = [
    'temperature_2m', 'dew_point_2m', 'relative_humidity_2m',
    'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid',
    'freezing_level_height', 'precipitation', 'snowfall',
    'wind_speed_10m',
  ].join(',')

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: IcingHour[] = raw.hourly.time.map((t: string, i: number) => {
    const temp = raw.hourly.temperature_2m?.[i] ?? 0
    const dewpoint = raw.hourly.dew_point_2m?.[i] ?? 0
    const humidity = raw.hourly.relative_humidity_2m?.[i] ?? 0
    const cloudCover = raw.hourly.cloud_cover?.[i] ?? 0
    const cloudMid = raw.hourly.cloud_cover_mid?.[i] ?? 0
    const freezingLvl = raw.hourly.freezing_level_height?.[i] ?? 0
    const precip = raw.hourly.precipitation?.[i] ?? 0

    // Icing most likely -2°C to -20°C with high humidity and clouds
    let icingProb = 0
    if (temp <= 0 && temp >= -20 && humidity >= 75) {
      const tempScore = temp >= -8 ? 40 : temp >= -15 ? 30 : 15
      const humScore = Math.min(30, (humidity - 75) * 2)
      const cloudScore = Math.min(20, cloudMid * 0.2 + cloudCover * 0.1)
      const precipBonus = precip > 0 ? 10 : 0
      icingProb = Math.min(100, Math.round(tempScore + humScore + cloudScore + precipBonus))
    }

    return {
      time: t,
      hour: t.slice(11, 16),
      icingProb,
      icingType: icingType(temp, humidity),
      temp: Math.round(temp * 10) / 10,
      dewpoint: Math.round(dewpoint * 10) / 10,
      humidity: Math.round(humidity),
      cloudCover: Math.round(cloudCover),
      freezingLvl: Math.round(freezingLvl / 100) * 100,
    }
  })

  const maxIcingProb = Math.max(0, ...hours.map(h => h.icingProb))
  const peakHour = hours.find(h => h.icingProb === maxIcingProb) ?? null
  const severeHours = hours.filter(h => h.icingProb >= 50).length

  const icingHours = hours.filter(h => h.icingProb > 10)
  const icingLayerBase = icingHours.length > 0 ? Math.min(...icingHours.map(h => Math.max(0, h.freezingLvl - 800))) : 0
  const icingLayerTop = icingHours.length > 0 ? Math.max(...icingHours.map(h => h.freezingLvl + 500)) : 0

  return NextResponse.json({
    hours: hours.slice(0, 48),
    currentIcingProb: hours[0]?.icingProb ?? 0,
    currentIcingType: hours[0]?.icingType ?? 'Ninguno',
    maxIcingProb,
    icingLayerBase,
    icingLayerTop,
    severeHours,
    peakHour,
  } satisfies IcingData)
}
