import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface WildlifeActivityData {
  overallIndex: number
  category: 'excellent' | 'good' | 'fair' | 'poor'
  species: WildlifeGroup[]
  bestPeriod: string | null
  moonPhase: string
  moonInfluence: 'high' | 'moderate' | 'low'
  hours: WildlifeHour[]
}

export interface WildlifeGroup {
  name: string
  emoji: string
  score: number
  rating: WildlifeActivityData['category']
  tip: string
  color: string
}

export interface WildlifeHour {
  hour: string
  activity: number
  temp: number
  wind: number
}

const RATING_COLOR = { excellent: '#22c55e', good: '#84cc16', fair: '#eab308', poor: '#f87171' }

function ratingFromScore(score: number): WildlifeActivityData['category'] {
  if (score >= 75) return 'excellent'
  if (score >= 50) return 'good'
  if (score >= 30) return 'fair'
  return 'poor'
}

function moonAge(date: Date): number {
  const knownNew = new Date(2024, 0, 11)
  const diff = (date.getTime() - knownNew.getTime()) / 86400000
  return ((diff % 29.5) + 29.5) % 29.5
}

function moonPhaseName(age: number): string {
  if (age < 1.5)  return 'Luna nueva'
  if (age < 7.4)  return 'Luna creciente'
  if (age < 8.5)  return 'Cuarto creciente'
  if (age < 14.4) return 'Gibosa creciente'
  if (age < 15.5) return 'Luna llena'
  if (age < 21.5) return 'Gibosa menguante'
  if (age < 22.5) return 'Cuarto menguante'
  if (age < 28.5) return 'Creciente menguante'
  return 'Luna nueva'
}

function birdScore(temp: number, wind: number, precip: number, cloud: number, hour: number): number {
  const timeScore = (hour >= 5 && hour <= 9) || (hour >= 17 && hour <= 20) ? 40 : hour >= 10 && hour <= 16 ? 25 : 5
  const windScore = wind < 15 ? 25 : wind < 25 ? 15 : 5
  const precipScore = precip === 0 ? 25 : precip < 0.5 ? 10 : 0
  const tempScore = temp >= 5 && temp <= 30 ? 10 : 5
  return Math.min(100, timeScore + windScore + precipScore + tempScore)
}

function mammalScore(temp: number, wind: number, precip: number, hour: number, moonAge: number): number {
  const dusk  = hour === 5 || hour === 6 || hour === 18 || hour === 19 || hour === 20
  const night = hour >= 21 || hour <= 4
  const timeScore = dusk ? 40 : night ? 30 : 10
  const moonBonus = moonAge >= 13 && moonAge <= 17 ? 15 : 0
  const windScore = wind < 20 ? 20 : 5
  const precipScore = precip === 0 ? 20 : 5
  const tempScore = temp > 0 && temp < 35 ? 5 : 0
  return Math.min(100, timeScore + moonBonus + windScore + precipScore + tempScore)
}

function insectScore(temp: number, wind: number, precip: number, cloud: number): number {
  const tempScore = temp >= 15 && temp <= 30 ? 40 : temp >= 10 ? 20 : 0
  const windScore = wind < 10 ? 30 : wind < 20 ? 15 : 0
  const precipScore = precip === 0 ? 20 : 0
  const cloudScore = cloud < 50 ? 10 : 5
  return Math.min(100, tempScore + windScore + precipScore + cloudScore)
}

function reptileScore(temp: number, cloud: number, precip: number): number {
  const tempScore = temp >= 20 && temp <= 35 ? 40 : temp >= 15 ? 25 : 5
  const sunScore  = cloud < 40 ? 35 : cloud < 70 ? 20 : 5
  const precipScore = precip === 0 ? 25 : 0
  return Math.min(100, tempScore + sunScore + precipScore)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,precipitation,cloud_cover&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times: string[]   = raw.hourly?.time ?? []
  const temps: number[]   = raw.hourly?.temperature_2m ?? []
  const winds: number[]   = raw.hourly?.wind_speed_10m ?? []
  const precips: number[] = raw.hourly?.precipitation ?? []
  const clouds: number[]  = raw.hourly?.cloud_cover ?? []

  const now    = new Date()
  const mAge   = moonAge(now)
  const mPhase = moonPhaseName(mAge)
  const mInfluence: WildlifeActivityData['moonInfluence'] = mAge >= 13 && mAge <= 17 ? 'high' : mAge > 10 && mAge < 20 ? 'moderate' : 'low'

  const hours: WildlifeHour[] = times.slice(0, 48).map((t, i) => {
    const hr     = parseInt(t.slice(11, 13))
    const temp   = temps[i] ?? 15
    const wind   = winds[i] ?? 5
    const precip = precips[i] ?? 0
    const cloud  = clouds[i] ?? 30
    const bird   = birdScore(temp, wind, precip, cloud, hr)
    const mammal = mammalScore(temp, wind, precip, hr, mAge)
    const insect = insectScore(temp, wind, precip, cloud)
    const avg    = Math.round((bird + mammal + insect) / 3)
    return { hour: t.slice(11, 16), activity: avg, temp: Math.round(temp * 10) / 10, wind: Math.round(wind) }
  })

  const t0 = temps[0] ?? 15
  const w0 = winds[0] ?? 5
  const p0 = precips[0] ?? 0
  const c0 = clouds[0] ?? 30
  const h0 = parseInt(times[0]?.slice(11, 13) ?? '12')

  const birdS    = birdScore(t0, w0, p0, c0, h0)
  const mammalS  = mammalScore(t0, w0, p0, h0, mAge)
  const insectS  = insectScore(t0, w0, p0, c0)
  const reptileS = reptileScore(t0, c0, p0)
  const fishS    = Math.round((60 + mAge < 15 ? 20 : 0 + (p0 === 0 ? 20 : 0)) * 0.8)

  const species: WildlifeGroup[] = [
    { name: 'Aves', emoji: '🐦', score: birdS, rating: ratingFromScore(birdS), color: RATING_COLOR[ratingFromScore(birdS)], tip: birdS >= 70 ? 'Excelente para observación de aves' : h0 < 5 || h0 > 20 ? 'Actividad mínima de noche' : 'Condiciones moderadas' },
    { name: 'Mamíferos', emoji: '🦌', score: mammalS, rating: ratingFromScore(mammalS), color: RATING_COLOR[ratingFromScore(mammalS)], tip: mammalS >= 70 ? 'Luna favorable — alta actividad' : 'Mayor actividad al amanecer/atardecer' },
    { name: 'Insectos', emoji: '🦋', score: insectS, rating: ratingFromScore(insectS), color: RATING_COLOR[ratingFromScore(insectS)], tip: insectS >= 70 ? 'Actividad máxima con calor y sin viento' : t0 < 15 ? 'Temperatura baja — actividad mínima' : 'Condiciones aceptables' },
    { name: 'Reptiles', emoji: '🦎', score: reptileS, rating: ratingFromScore(reptileS), color: RATING_COLOR[ratingFromScore(reptileS)], tip: reptileS >= 70 ? 'Calor y sol — reptiles activos asoleándose' : c0 > 70 ? 'Nublado — reptiles en reposo' : 'Temperatura moderada' },
    { name: 'Pesca', emoji: '🐟', score: fishS, rating: ratingFromScore(fishS), color: RATING_COLOR[ratingFromScore(fishS)], tip: mAge >= 13 && mAge <= 17 ? 'Luna llena — alta actividad piscícola' : 'Actividad piscícola moderada' },
  ]

  const overallIdx = Math.round(species.reduce((s, sp) => s + sp.score, 0) / species.length)
  const bestHour   = hours.slice(0, 24).reduce((b, h) => h.activity > b.activity ? h : b, hours[0])

  return NextResponse.json({
    overallIndex: overallIdx,
    category: ratingFromScore(overallIdx),
    species,
    bestPeriod: bestHour ? bestHour.hour : null,
    moonPhase: mPhase,
    moonInfluence: mInfluence,
    hours,
  } satisfies WildlifeActivityData)
}
