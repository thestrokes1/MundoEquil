import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface WinterSportsData {
  skiIndex: number
  snowDepthCm: number
  snowQuality: 'no_snow' | 'powder' | 'packed' | 'wet' | 'icy' | 'slush'
  windChill: number
  days: WinterSportsDay[]
  currentConditions: { temp: number; wind: number; snowfall: number; visibility: string }
  recommendation: string
}

export interface WinterSportsDay {
  date: string
  label: string
  skiIndex: number
  snowfallCm: number
  tempMax: number
  tempMin: number
  windMax: number
  quality: WinterSportsData['snowQuality']
}

function snowQuality(temp: number, wind: number, newSnow: number, depth: number): WinterSportsData['snowQuality'] {
  if (depth < 5) return 'no_snow'
  if (temp <= -5 && newSnow > 5) return 'powder'
  if (temp <= 0 && wind > 20) return 'icy'
  if (temp <= -1 && depth > 20) return 'packed'
  if (temp >= 2) return 'slush'
  return 'wet'
}

function skiIndex(temp: number, wind: number, newSnow: number, depth: number, vis: number): number {
  if (depth < 30) return Math.max(0, Math.round(depth * 1.5))
  const tempScore = temp >= -15 && temp <= -2 ? 30 : temp > -2 && temp <= 2 ? 20 : temp < -15 ? 15 : 5
  const windScore = wind < 20 ? 25 : wind < 30 ? 15 : wind < 40 ? 5 : 0
  const snowScore = newSnow > 20 ? 25 : newSnow > 10 ? 20 : newSnow > 5 ? 15 : newSnow > 0 ? 10 : depth > 50 ? 15 : 5
  const visScore = vis >= 5 ? 20 : vis >= 2 ? 10 : 0
  return Math.min(100, tempScore + windScore + snowScore + visScore)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const params = [
    'temperature_2m', 'wind_speed_10m', 'snowfall', 'snow_depth',
    'visibility', 'wind_gusts_10m', 'freezing_level_height',
  ].join(',')

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&daily=snowfall_sum,snow_depth_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&forecast_days=7&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const temp0 = raw.hourly.temperature_2m?.[0] ?? 0
  const wind0 = raw.hourly.wind_speed_10m?.[0] ?? 0
  const snow0 = raw.hourly.snowfall?.[0] ?? 0
  const depth0 = raw.hourly.snow_depth?.[0] ?? 0
  const vis0 = (raw.hourly.visibility?.[0] ?? 10000) / 1000

  // Wind chill (Siple-Passel approximation)
  const windChill = temp0 <= 10 && wind0 > 3
    ? Math.round(13.12 + 0.6215 * temp0 - 11.37 * Math.pow(wind0, 0.16) + 0.3965 * temp0 * Math.pow(wind0, 0.16))
    : Math.round(temp0)

  const quality = snowQuality(temp0, wind0, snow0, depth0 * 100)
  const currentSkiIndex = skiIndex(temp0, wind0, snow0 * 100, depth0 * 100, vis0)

  const days: WinterSportsDay[] = (raw.daily?.time ?? []).map((d: string, i: number) => {
    const tmax = raw.daily.temperature_2m_max?.[i] ?? 0
    const tmin = raw.daily.temperature_2m_min?.[i] ?? -5
    const sf = (raw.daily.snowfall_sum?.[i] ?? 0) * 100
    const sdMax = (raw.daily.snow_depth_max?.[i] ?? 0) * 100
    const wMax = raw.daily.wind_speed_10m_max?.[i] ?? 0
    const si = skiIndex((tmax + tmin) / 2, wMax, sf, sdMax, 8)
    return {
      date: d,
      label: new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      skiIndex: si,
      snowfallCm: Math.round(sf),
      tempMax: Math.round(tmax * 10) / 10,
      tempMin: Math.round(tmin * 10) / 10,
      windMax: Math.round(wMax),
      quality: snowQuality((tmax + tmin) / 2, wMax, sf, sdMax),
    }
  })

  function getRec(): string {
    if (depth0 * 100 < 30) return 'Nieve insuficiente para deportes de invierno'
    if (currentSkiIndex >= 70) return '🎿 Condiciones excelentes — ¡a esquiar!'
    if (currentSkiIndex >= 50) return '🎿 Condiciones buenas para esquí'
    if (currentSkiIndex >= 30) return '🏔️ Condiciones aceptables — precaución con viento'
    return '⚠️ Condiciones difíciles — no recomendado'
  }

  return NextResponse.json({
    skiIndex: currentSkiIndex,
    snowDepthCm: Math.round(depth0 * 100),
    snowQuality: quality,
    windChill,
    days,
    currentConditions: {
      temp: Math.round(temp0 * 10) / 10,
      wind: Math.round(wind0),
      snowfall: Math.round(snow0 * 100),
      visibility: vis0 >= 10 ? '>10 km' : `${vis0.toFixed(1)} km`,
    },
    recommendation: getRec(),
  } satisfies WinterSportsData)
}
