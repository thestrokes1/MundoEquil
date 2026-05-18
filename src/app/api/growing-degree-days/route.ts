import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 86400

export interface GDDData {
  baseTemp: number
  accumulated: number
  today: number
  weekly: number
  cropStages: CropStage[]
  days: GDDDay[]
  season: string
  adviceGeneral: string
}

export interface CropStage {
  crop: string
  emoji: string
  thresholdGDD: number
  currentStage: string
  nextStage: string
  gddToNext: number
  progress: number
}

export interface GDDDay {
  label: string
  gdd: number
  cumulative: number
}

const CROPS = [
  {
    name: 'Maíz', emoji: '🌽', base: 10,
    stages: [
      { name: 'Siembra', gdd: 0 },
      { name: 'Emergencia', gdd: 60 },
      { name: 'V6 (6 hojas)', gdd: 350 },
      { name: 'VT (espiga)', gdd: 800 },
      { name: 'R1 (seda)', gdd: 900 },
      { name: 'Madurez', gdd: 1500 },
    ],
  },
  {
    name: 'Trigo', emoji: '🌾', base: 0,
    stages: [
      { name: 'Siembra', gdd: 0 },
      { name: 'Germinación', gdd: 120 },
      { name: 'Encañado', gdd: 400 },
      { name: 'Espigado', gdd: 700 },
      { name: 'Madurez', gdd: 1100 },
    ],
  },
  {
    name: 'Tomate', emoji: '🍅', base: 10,
    stages: [
      { name: 'Transplante', gdd: 0 },
      { name: 'Floración', gdd: 200 },
      { name: 'Fruto verde', gdd: 500 },
      { name: 'Madurando', gdd: 800 },
      { name: 'Cosecha', gdd: 1000 },
    ],
  },
]

function computeGDD(maxT: number, minT: number, base: number): number {
  const avg = (maxT + minT) / 2
  return Math.max(0, avg - base)
}

function getCropStage(gddAcc: number, base: number, crop: typeof CROPS[0]): CropStage {
  const stages = crop.stages
  let current = stages[0]
  let next = stages[1] ?? stages[0]

  for (let i = 0; i < stages.length - 1; i++) {
    if (gddAcc >= stages[i].gdd && gddAcc < stages[i + 1].gdd) {
      current = stages[i]
      next = stages[i + 1]
      break
    }
    if (gddAcc >= stages[stages.length - 1].gdd) {
      current = stages[stages.length - 1]
      next = stages[stages.length - 1]
      break
    }
  }

  const range = next.gdd - current.gdd
  const progress = range > 0 ? Math.min(100, Math.round(((gddAcc - current.gdd) / range) * 100)) : 100
  const gddToNext = Math.max(0, next.gdd - gddAcc)

  return {
    crop: crop.name,
    emoji: crop.emoji,
    thresholdGDD: gddAcc,
    currentStage: current.name,
    nextStage: next.name,
    gddToNext: Math.round(gddToNext),
    progress,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const yearStart = new Date(today); yearStart.setMonth(0, 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const [histRes, fcRes] = await Promise.all([
    fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&start_date=${fmt(yearStart)}&end_date=${fmt(yesterday)}&timezone=auto`,
      { next: { revalidate } }
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&forecast_days=14&timezone=auto`,
      { next: { revalidate } }
    ),
  ])

  if (!histRes.ok && !fcRes.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

  const histJson = histRes.ok ? await histRes.json() : { daily: { time: [], temperature_2m_max: [], temperature_2m_min: [] } }
  const fcJson   = fcRes.ok  ? await fcRes.json()   : { daily: { time: [], temperature_2m_max: [], temperature_2m_min: [] } }

  // Merge: history first, then forecast (deduplicate by date)
  const allTimes  = [...(histJson.daily?.time ?? []), ...(fcJson.daily?.time ?? [])]
  const allMax    = [...(histJson.daily?.temperature_2m_max ?? []), ...(fcJson.daily?.temperature_2m_max ?? [])]
  const allMin    = [...(histJson.daily?.temperature_2m_min ?? []), ...(fcJson.daily?.temperature_2m_min ?? [])]
  const seen = new Set<string>()
  const dailyTimes: string[] = []
  const dailyMax: number[]   = []
  const dailyMin: number[]   = []
  allTimes.forEach((t, i) => {
    if (!seen.has(t)) { seen.add(t); dailyTimes.push(t); dailyMax.push(allMax[i]); dailyMin.push(allMin[i]) }
  })
  const BASE = 10
  let cumulative = 0
  const gddHistory: { label: string; gdd: number; cumulative: number }[] = []
  void gddHistory

  const todayStr = today.toISOString().split('T')[0]
  let accumulated = 0
  let todayGDD = 0
  let weeklyGDD = 0
  let daysFromToday = 0

  dailyTimes.forEach((t, i) => {
    const gdd = computeGDD(dailyMax[i] ?? 20, dailyMin[i] ?? 10, BASE)
    const rnd = Math.round(gdd * 10) / 10
    cumulative += rnd

    if (t <= todayStr) {
      accumulated = cumulative
      if (t === todayStr) todayGDD = rnd
    }

    if (t > todayStr && daysFromToday < 7) {
      weeklyGDD += rnd
      daysFromToday++
    }
  })

  const recentDays: GDDDay[] = []
  const todayIdx = dailyTimes.indexOf(todayStr)
  const startIdx = Math.max(0, todayIdx - 6)
  let runCum = 0

  dailyTimes.slice(0, todayIdx + 1).forEach((t, i) => {
    const gdd = computeGDD(dailyMax[i] ?? 20, dailyMin[i] ?? 10, BASE)
    runCum += Math.round(gdd * 10) / 10
  })

  for (let i = startIdx; i <= todayIdx; i++) {
    const gdd = Math.round(computeGDD(dailyMax[i] ?? 20, dailyMin[i] ?? 10, BASE) * 10) / 10
    const d = new Date(dailyTimes[i])
    recentDays.push({
      label: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      gdd,
      cumulative: Math.round(accumulated - (dailyTimes.slice(i + 1, todayIdx + 1).reduce((s, _, j) => {
        return s + computeGDD(dailyMax[i + 1 + j] ?? 20, dailyMin[i + 1 + j] ?? 10, BASE)
      }, 0))),
    })
  }

  const cropStages = CROPS.map(c => getCropStage(accumulated, c.base, c))
  const month = new Date().getMonth()
  const season = month >= 2 && month <= 4 ? 'Primavera'
    : month >= 5 && month <= 7 ? 'Verano'
    : month >= 8 && month <= 10 ? 'Otoño'
    : 'Invierno'

  const advice = accumulated < 200
    ? 'GDD acumulados bajos — temporada temprana, esperar más calor para siembras sensibles'
    : accumulated < 600
    ? 'Acumulación moderada — buen momento para cultivos de ciclo corto'
    : accumulated < 1200
    ? 'GDD alto — cultivos de verano en pleno desarrollo'
    : 'GDD muy alto — planificar cosecha y cultivos de otoño'

  return NextResponse.json({
    baseTemp: BASE,
    accumulated: Math.round(accumulated),
    today: Math.round(todayGDD * 10) / 10,
    weekly: Math.round(weeklyGDD * 10) / 10,
    cropStages,
    days: recentDays,
    season,
    adviceGeneral: advice,
  } satisfies GDDData)
}
