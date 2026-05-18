import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface UVSkinData {
  currentUV: number
  maxUV: number
  maxUVTime: string
  skinTypes: SkinTypeBurn[]
  hours: UVHour[]
  spfRecommendation: number
  protection: string[]
}

export interface SkinTypeBurn {
  type: number
  description: string
  burnTime: number
  color: string
}

export interface UVHour {
  time: string
  hour: string
  uv: number
  burnTimeType3: number
}

const SKIN_TYPES = [
  { type: 1, description: 'Muy clara — siempre se quema', mef: 2.5, color: '#fde68a' },
  { type: 2, description: 'Clara — suele quemarse',        mef: 3,   color: '#fcd34d' },
  { type: 3, description: 'Media — a veces quemarse',      mef: 4,   color: '#d97706' },
  { type: 4, description: 'Morena — rara vez quemarse',    mef: 5,   color: '#92400e' },
  { type: 5, description: 'Oscura — muy raramente',        mef: 6,   color: '#78350f' },
  { type: 6, description: 'Muy oscura — nunca quemarse',   mef: 8,   color: '#451a03' },
]

// Burn time (min) = MEF * 200 / UVI (Diffey formula approximation)
function burnTime(uvi: number, mef: number): number {
  if (uvi <= 0) return 999
  return Math.round(mef * 200 / uvi)
}

function spfRecommendation(uvi: number): number {
  if (uvi >= 11) return 50
  if (uvi >= 8) return 30
  if (uvi >= 6) return 20
  if (uvi >= 3) return 15
  return 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=uv_index&daily=uv_index_max&forecast_days=1&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const hours: UVHour[] = (raw.hourly?.time ?? []).slice(0, 24).map((t: string, i: number) => {
    const uv = raw.hourly.uv_index?.[i] ?? 0
    return {
      time: t,
      hour: t.slice(11, 16),
      uv: Math.round(uv * 10) / 10,
      burnTimeType3: burnTime(uv, SKIN_TYPES[2].mef),
    }
  })

  const currentUV = hours[0]?.uv ?? 0
  const maxUV = raw.daily?.uv_index_max?.[0] ?? currentUV
  const peakHour = hours.reduce((b, h) => h.uv > b.uv ? h : b, hours[0])

  const skinTypes: SkinTypeBurn[] = SKIN_TYPES.map(st => ({
    type: st.type,
    description: st.description,
    burnTime: burnTime(maxUV, st.mef),
    color: st.color,
  }))

  const protection: string[] = []
  if (maxUV >= 3) protection.push('Usar protector solar')
  if (maxUV >= 6) protection.push('Gorra y gafas de sol')
  if (maxUV >= 8) protection.push('Evitar exposición 10h–16h')
  if (maxUV >= 11) protection.push('¡Máxima precaución!')

  return NextResponse.json({
    currentUV,
    maxUV: Math.round(maxUV * 10) / 10,
    maxUVTime: peakHour?.hour ?? '12:00',
    skinTypes,
    hours,
    spfRecommendation: spfRecommendation(maxUV),
    protection,
  } satisfies UVSkinData)
}
