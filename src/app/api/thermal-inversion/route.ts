import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface ThermalInversionData {
  hasInversion: boolean
  inversionStrength: 'none' | 'weak' | 'moderate' | 'strong'
  smogRisk: 'low' | 'moderate' | 'high' | 'very_high'
  inversions: InversionHour[]
  currentSpread: number
  currentBL: number
  bestVentilation: string | null
  trappingHours: number
}

export interface InversionHour {
  time: string
  hour: string
  temp: number
  dewpoint: number
  spread: number
  windSpeed: number
  inversionLikely: boolean
  smogScore: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const params = [
    'temperature_2m', 'dew_point_2m', 'relative_humidity_2m',
    'wind_speed_10m', 'surface_pressure', 'cloud_cover',
    'boundary_layer_height',
  ].join(',')

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const inversions: InversionHour[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const temp = raw.hourly.temperature_2m?.[i] ?? 15
    const dewpoint = raw.hourly.dew_point_2m?.[i] ?? 10
    const humidity = raw.hourly.relative_humidity_2m?.[i] ?? 60
    const wind = raw.hourly.wind_speed_10m?.[i] ?? 3
    const cloud = raw.hourly.cloud_cover?.[i] ?? 30
    const bl = raw.hourly.boundary_layer_height?.[i] ?? 500
    const spread = temp - dewpoint

    const hour = parseInt(t.slice(11, 13))
    const isNight = hour < 7 || hour > 20
    const isCalm = wind < 3
    const isHumid = humidity > 75

    // Radiation inversion: clear sky, calm wind, night/early morning
    const radiationInversion = isNight && isCalm && cloud < 30 && isHumid
    // Subsidence inversion: high pressure, dry air
    const subsidenceInversion = !isNight && spread > 10 && bl < 400

    const inversionLikely = radiationInversion || subsidenceInversion
    const smogScore = Math.min(100, Math.round(
      (inversionLikely ? 40 : 0) +
      (wind < 2 ? 30 : wind < 5 ? 15 : 0) +
      (bl < 300 ? 20 : bl < 600 ? 10 : 0) +
      (cloud < 20 ? 10 : 0)
    ))

    return {
      time: t,
      hour: t.slice(11, 16),
      temp: Math.round(temp * 10) / 10,
      dewpoint: Math.round(dewpoint * 10) / 10,
      spread: Math.round(spread * 10) / 10,
      windSpeed: Math.round(wind * 10) / 10,
      inversionLikely,
      smogScore,
    }
  })

  const trappingHours = inversions.filter(h => h.inversionLikely).length
  const maxSmog = Math.max(0, ...inversions.map(h => h.smogScore))
  const currentBL = (raw.hourly?.boundary_layer_height?.[0] ?? 500)
  const currentSpread = inversions[0]?.spread ?? 5

  // Best ventilation = hour with lowest smog score and daytime
  const daytimeHours = inversions.filter(h => {
    const hr = parseInt(h.hour.split(':')[0])
    return hr >= 10 && hr <= 18
  })
  const bestVent = daytimeHours.reduce((b, h) => h.smogScore < b.smogScore ? h : b, daytimeHours[0])

  function smogRisk(score: number): ThermalInversionData['smogRisk'] {
    if (score >= 70) return 'very_high'
    if (score >= 50) return 'high'
    if (score >= 30) return 'moderate'
    return 'low'
  }

  function invStrength(count: number): ThermalInversionData['inversionStrength'] {
    if (count >= 10) return 'strong'
    if (count >= 5) return 'moderate'
    if (count >= 2) return 'weak'
    return 'none'
  }

  return NextResponse.json({
    hasInversion: trappingHours >= 2,
    inversionStrength: invStrength(trappingHours),
    smogRisk: smogRisk(maxSmog),
    inversions,
    currentSpread,
    currentBL: Math.round(currentBL),
    bestVentilation: bestVent?.hour ?? null,
    trappingHours,
  } satisfies ThermalInversionData)
}
