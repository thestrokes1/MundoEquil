import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface OutdoorActivitiesData {
  golf: ActivityScore
  hiking: ActivityScore
  gardening: ActivityScore
  cycling: ActivityScore
  photography: ActivityScore
  hours: ActivityHour[]
  bestActivityToday: string
  bestTimeWindow: string | null
}

export interface ActivityScore {
  name: string
  emoji: string
  score: number
  rating: 'excellent' | 'good' | 'fair' | 'poor'
  tips: string[]
}

export interface ActivityHour {
  time: string
  hour: string
  golf: number
  hiking: number
  gardening: number
  temp: number
  wind: number
  precip: number
}

function rating(score: number): ActivityScore['rating'] {
  if (score >= 75) return 'excellent'
  if (score >= 50) return 'good'
  if (score >= 30) return 'fair'
  return 'poor'
}

function golfScore(t: number, wind: number, precip: number, cloud: number): number {
  const tempScore = t >= 15 && t <= 28 ? 30 : t >= 10 && t <= 35 ? 20 : 5
  const windScore = wind < 15 ? 30 : wind < 25 ? 20 : wind < 35 ? 10 : 0
  const precipScore = precip === 0 ? 25 : precip < 0.5 ? 10 : 0
  const cloudScore = cloud < 30 ? 15 : cloud < 60 ? 10 : 5
  return Math.min(100, tempScore + windScore + precipScore + cloudScore)
}

function hikingScore(t: number, wind: number, precip: number, vis: number, cloud: number): number {
  const tempScore = t >= 10 && t <= 25 ? 30 : t >= 5 && t <= 30 ? 20 : 5
  const windScore = wind < 20 ? 25 : wind < 30 ? 15 : wind < 40 ? 5 : 0
  const precipScore = precip === 0 ? 25 : precip < 1 ? 10 : 0
  const visScore = vis >= 8 ? 20 : vis >= 4 ? 10 : 0
  return Math.min(100, tempScore + windScore + precipScore + visScore)
}

function gardeningScore(t: number, wind: number, precip: number, humidity: number): number {
  const tempScore = t >= 12 && t <= 28 ? 30 : t >= 8 && t <= 35 ? 20 : 5
  const windScore = wind < 20 ? 25 : wind < 30 ? 15 : 5
  const precipScore = precip === 0 ? 25 : precip < 2 ? 15 : 0
  const humidScore = humidity >= 40 && humidity <= 75 ? 20 : humidity < 40 ? 10 : 8
  return Math.min(100, tempScore + windScore + precipScore + humidScore)
}

function cyclingScore(t: number, wind: number, precip: number, cloud: number): number {
  const tempScore = t >= 12 && t <= 26 ? 30 : t >= 8 && t <= 32 ? 20 : 5
  const windScore = wind < 15 ? 35 : wind < 25 ? 20 : wind < 35 ? 8 : 0
  const precipScore = precip === 0 ? 25 : precip < 0.3 ? 5 : 0
  const cloudScore = cloud < 50 ? 10 : 5
  return Math.min(100, tempScore + windScore + precipScore + cloudScore)
}

function photographyScore(t: number, cloud: number, precip: number, hour: number): number {
  const goldenHour = (hour >= 6 && hour <= 8) || (hour >= 17 && hour <= 19)
  const timeScore = goldenHour ? 35 : hour >= 9 && hour <= 16 ? 15 : 5
  const cloudScore = cloud >= 20 && cloud <= 70 ? 30 : cloud < 20 ? 20 : 10
  const precipScore = precip === 0 ? 25 : 0
  const tempScore = t >= 5 && t <= 35 ? 10 : 5
  return Math.min(100, timeScore + cloudScore + precipScore + tempScore)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,precipitation,cloud_cover,relative_humidity_2m,visibility&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: ActivityHour[] = (raw.hourly?.time ?? []).slice(0, 48).map((t: string, i: number) => {
    const temp = raw.hourly.temperature_2m?.[i] ?? 20
    const wind = raw.hourly.wind_speed_10m?.[i] ?? 5
    const precip = raw.hourly.precipitation?.[i] ?? 0
    const cloud = raw.hourly.cloud_cover?.[i] ?? 30
    const humidity = raw.hourly.relative_humidity_2m?.[i] ?? 60
    const vis = (raw.hourly.visibility?.[i] ?? 10000) / 1000
    const hour = parseInt(t.slice(11, 13))
    return {
      time: t,
      hour: t.slice(11, 16),
      golf: golfScore(temp, wind, precip, cloud),
      hiking: hikingScore(temp, wind, precip, vis, cloud),
      gardening: gardeningScore(temp, wind, precip, humidity),
      temp: Math.round(temp * 10) / 10,
      wind: Math.round(wind),
      precip: Math.round(precip * 10) / 10,
    }
  })

  const current = hours[0]
  const t0 = current?.temp ?? 20
  const w0 = current?.wind ?? 5
  const p0 = current?.precip ?? 0
  const c0 = (raw.hourly?.cloud_cover?.[0] ?? 30)
  const h0 = (raw.hourly?.relative_humidity_2m?.[0] ?? 60)
  const v0 = ((raw.hourly?.visibility?.[0] ?? 10000) / 1000)

  const golfS = golfScore(t0, w0, p0, c0)
  const hikingS = hikingScore(t0, w0, p0, v0, c0)
  const gardenS = gardeningScore(t0, w0, p0, h0)
  const cyclingS = cyclingScore(t0, w0, p0, c0)
  const photoS = photographyScore(t0, c0, p0, parseInt(new Date().toTimeString().slice(0, 2)))

  const activities: ActivityScore[] = [
    {
      name: 'Golf', emoji: '⛳', score: golfS, rating: rating(golfS),
      tips: golfS >= 70 ? ['Condiciones perfectas para jugar'] : w0 > 25 ? ['Viento fuerte — ajusta el swing'] : p0 > 0 ? ['Posible lluvia — lleva impermeable'] : ['Condiciones aceptables'],
    },
    {
      name: 'Senderismo', emoji: '🥾', score: hikingS, rating: rating(hikingS),
      tips: hikingS >= 70 ? ['Excelente día para caminar'] : t0 > 30 ? ['Calor — hidrátate bien'] : w0 > 30 ? ['Viento fuerte en cimas'] : ['Condiciones moderadas'],
    },
    {
      name: 'Jardinería', emoji: '🌻', score: gardenS, rating: rating(gardenS),
      tips: gardenS >= 70 ? ['Perfecto para plantar y regar'] : p0 > 0 ? ['Con lluvia — ahorra riego'] : t0 > 32 ? ['Trabaja por la mañana'] : ['Buen día para el jardín'],
    },
    {
      name: 'Ciclismo', emoji: '🚴', score: cyclingS, rating: rating(cyclingS),
      tips: cyclingS >= 70 ? ['Condiciones ideales para rodar'] : w0 > 25 ? ['Viento de frente — rueda corta'] : p0 > 0 ? ['Lluvia — precaución en descensos'] : ['Condiciones aceptables'],
    },
    {
      name: 'Fotografía', emoji: '📷', score: photoS, rating: rating(photoS),
      tips: photoS >= 70 ? ['Luz espectacular ahora'] : c0 >= 20 && c0 <= 70 ? ['Nubes suaves — luz difusa ideal'] : ['Revisa la hora dorada'],
    },
  ]

  const best = activities.reduce((b, a) => a.score > b.score ? a : b, activities[0])

  // Best 2-hour window today
  const daytimeHours = hours.filter(h => {
    const hr = parseInt(h.hour)
    return hr >= 7 && hr <= 20
  })
  const bestWindow = daytimeHours.reduce((b, h) => {
    const avg = (h.golf + h.hiking + h.gardening) / 3
    const bAvg = (b.golf + b.hiking + b.gardening) / 3
    return avg > bAvg ? h : b
  }, daytimeHours[0])

  return NextResponse.json({
    golf: activities[0],
    hiking: activities[1],
    gardening: activities[2],
    cycling: activities[3],
    photography: activities[4],
    hours: hours.slice(0, 48),
    bestActivityToday: `${best.emoji} ${best.name}`,
    bestTimeWindow: bestWindow ? `${bestWindow.hour} (${best.name}: ${best.score}/100)` : null,
  } satisfies OutdoorActivitiesData)
}
