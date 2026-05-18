import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface WaterActivityData {
  surfing: ActivityRating
  kayaking: ActivityRating
  kitesurfing: ActivityRating
  openWaterSwim: ActivityRating
  paddleboard: ActivityRating
  sailing: ActivityRating
  bestActivity: string
  hours: WaterActivityHour[]
}

export interface ActivityRating {
  name: string
  emoji: string
  score: number
  rating: 'excellent' | 'good' | 'fair' | 'poor'
  tip: string
  color: string
}

export interface WaterActivityHour {
  hour: string
  surfing: number
  kayaking: number
  kitesurfing: number
  wind: number
  waveHeight: number
}

const RATING_COLOR = { excellent: '#22c55e', good: '#84cc16', fair: '#eab308', poor: '#f87171' }

function activityRating(score: number): ActivityRating['rating'] {
  if (score >= 75) return 'excellent'
  if (score >= 50) return 'good'
  if (score >= 25) return 'fair'
  return 'poor'
}

function surfingScore(wave: number, period: number, wind: number, windDir: number, precipitation: number): number {
  const waveScore = wave >= 0.5 && wave <= 2.5 ? 30 : wave < 0.5 ? 10 : wave <= 4 ? 20 : 5
  const periodScore = period >= 8 ? 25 : period >= 6 ? 15 : 5
  const windScore = wind < 15 ? 30 : wind < 25 ? 20 : wind < 35 ? 10 : 0
  const precipScore = precipitation === 0 ? 15 : 0
  return Math.min(100, waveScore + periodScore + windScore + precipScore)
}

function kayakingScore(wind: number, precipitation: number, wave: number): number {
  const windScore = wind < 15 ? 40 : wind < 25 ? 25 : wind < 35 ? 10 : 0
  const precipScore = precipitation === 0 ? 30 : precipitation < 1 ? 10 : 0
  const waveScore = wave < 0.5 ? 30 : wave < 1 ? 20 : wave < 2 ? 5 : 0
  return Math.min(100, windScore + precipScore + waveScore)
}

function kitesurfingScore(wind: number, precipitation: number, wave: number): number {
  const windScore = wind >= 15 && wind <= 35 ? 50 : wind >= 10 && wind < 15 ? 30 : wind > 35 && wind <= 45 ? 20 : 0
  const precipScore = precipitation === 0 ? 25 : 0
  const waveScore = wave >= 0.3 && wave <= 2 ? 25 : wave < 0.3 ? 15 : 0
  return Math.min(100, windScore + precipScore + waveScore)
}

function paddleboardScore(wind: number, precipitation: number, wave: number): number {
  const windScore = wind < 10 ? 40 : wind < 20 ? 25 : wind < 30 ? 10 : 0
  const waveScore = wave < 0.3 ? 35 : wave < 0.7 ? 20 : wave < 1 ? 5 : 0
  const precipScore = precipitation === 0 ? 25 : 0
  return Math.min(100, windScore + waveScore + precipScore)
}

function openWaterScore(temp: number, wind: number, precipitation: number, wave: number): number {
  const tempScore = temp >= 18 ? 30 : temp >= 14 ? 20 : temp >= 10 ? 10 : 0
  const windScore = wind < 20 ? 25 : wind < 30 ? 15 : 5
  const waveScore = wave < 0.5 ? 30 : wave < 1 ? 15 : 5
  const precipScore = precipitation === 0 ? 15 : 0
  return Math.min(100, tempScore + windScore + waveScore + precipScore)
}

function sailingScore(wind: number, precipitation: number, wave: number): number {
  const windScore = wind >= 10 && wind <= 40 ? 40 : wind >= 5 ? 25 : wind > 40 ? 10 : 10
  const precipScore = precipitation === 0 ? 25 : precipitation < 1 ? 10 : 0
  const waveScore = wave < 2 ? 35 : wave < 3.5 ? 20 : 5
  return Math.min(100, windScore + precipScore + waveScore)
}

function makeTip(name: string, score: number, wind: number, wave: number): string {
  if (score >= 75) return `Condiciones perfectas para ${name}`
  if (wind > 35) return 'Viento excesivo — peligroso en mar abierto'
  if (wave > 3)  return 'Mar agitada — solo para expertos'
  if (score < 25) return `Condiciones desfavorables para ${name} hoy`
  return `Condiciones aceptables — precaución con el viento`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period,wind_wave_height&forecast_days=2&timezone=auto`
  const wxUrl     = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,precipitation,temperature_2m&forecast_days=2&timezone=auto`

  const [marineResult, wxRes] = await Promise.all([
    fetch(marineUrl, { next: { revalidate } }).catch(() => null),
    fetch(wxUrl, { next: { revalidate } }),
  ])

  if (!wxRes.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

  const marine = (marineResult?.ok) ? await marineResult.json().catch(() => ({})) : {}
  const wx     = await wxRes.json()

  const times: string[]    = wx.hourly?.time ?? []
  const winds: number[]    = wx.hourly?.wind_speed_10m ?? []
  const wdirs: number[]    = wx.hourly?.wind_direction_10m ?? []
  const precips: number[]  = wx.hourly?.precipitation ?? []
  const sst: number[]      = wx.hourly?.temperature_2m ?? []
  const waves: number[]    = marine.hourly?.wave_height ?? []
  const periods: number[]  = marine.hourly?.wave_period ?? []

  const hours: WaterActivityHour[] = times.slice(0, 48).map((t, i) => {
    const wind  = winds[i] ?? 10
    const wave  = waves[i] ?? 0.5
    const precip = precips[i] ?? 0
    return {
      hour: t.slice(11, 16),
      surfing:    surfingScore(wave, periods[i] ?? 7, wind, wdirs[i] ?? 270, precip),
      kayaking:   kayakingScore(wind, precip, wave),
      kitesurfing:kitesurfingScore(wind, precip, wave),
      wind: Math.round(wind),
      waveHeight: Math.round(wave * 10) / 10,
    }
  })

  const w0 = winds[0] ?? 10
  const wv = waves[0] ?? 0.5
  const p0 = precips[0] ?? 0
  const t0 = sst[0] ?? 20
  const per0 = periods[0] ?? 7

  const scores = {
    surfing: surfingScore(wv, per0, w0, wdirs[0] ?? 270, p0),
    kayaking: kayakingScore(w0, p0, wv),
    kitesurfing: kitesurfingScore(w0, p0, wv),
    openWaterSwim: openWaterScore(t0, w0, p0, wv),
    paddleboard: paddleboardScore(w0, p0, wv),
    sailing: sailingScore(w0, p0, wv),
  }

  const activities: WaterActivityData['surfing'][] = [
    { name: 'Surf', emoji: '🏄', score: scores.surfing, rating: activityRating(scores.surfing), color: RATING_COLOR[activityRating(scores.surfing)], tip: makeTip('surf', scores.surfing, w0, wv) },
    { name: 'Kayak', emoji: '🚣', score: scores.kayaking, rating: activityRating(scores.kayaking), color: RATING_COLOR[activityRating(scores.kayaking)], tip: makeTip('kayak', scores.kayaking, w0, wv) },
    { name: 'Kitesurf', emoji: '🪁', score: scores.kitesurfing, rating: activityRating(scores.kitesurfing), color: RATING_COLOR[activityRating(scores.kitesurfing)], tip: makeTip('kitesurf', scores.kitesurfing, w0, wv) },
    { name: 'Natación OW', emoji: '🏊', score: scores.openWaterSwim, rating: activityRating(scores.openWaterSwim), color: RATING_COLOR[activityRating(scores.openWaterSwim)], tip: makeTip('natación', scores.openWaterSwim, w0, wv) },
    { name: 'Paddleboard', emoji: '🏄‍♀️', score: scores.paddleboard, rating: activityRating(scores.paddleboard), color: RATING_COLOR[activityRating(scores.paddleboard)], tip: makeTip('paddleboard', scores.paddleboard, w0, wv) },
    { name: 'Vela', emoji: '⛵', score: scores.sailing, rating: activityRating(scores.sailing), color: RATING_COLOR[activityRating(scores.sailing)], tip: makeTip('vela', scores.sailing, w0, wv) },
  ]

  const best = activities.reduce((b, a) => a.score > b.score ? a : b, activities[0])

  return NextResponse.json({
    surfing: activities[0],
    kayaking: activities[1],
    kitesurfing: activities[2],
    openWaterSwim: activities[3],
    paddleboard: activities[4],
    sailing: activities[5],
    bestActivity: `${best.emoji} ${best.name}`,
    hours,
  } satisfies WaterActivityData)
}
