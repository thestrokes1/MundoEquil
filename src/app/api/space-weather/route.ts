import { NextRequest, NextResponse } from 'next/server'

export interface SpaceWeatherData {
  solarFlux: number | null
  kpIndex: number | null
  kpMax24h: number | null
  auroraLatitude: number | null
  geoStormLevel: 0 | 1 | 2 | 3 | 4 | 5
  geoStormLabel: string
  solarFlareClass: string | null
  forecast: {
    time: string
    kp: number
  }[]
}

function kpToLatitude(kp: number): number {
  // Approximate aurora visibility latitude from Kp index
  const lats: Record<number, number> = { 0: 90, 1: 85, 2: 80, 3: 72, 4: 66, 5: 62, 6: 58, 7: 54, 8: 50, 9: 45 }
  return lats[Math.min(Math.floor(kp), 9)] ?? 90
}

function kpToStormLevel(kp: number): { level: 0 | 1 | 2 | 3 | 4 | 5; label: string } {
  if (kp < 4) return { level: 0, label: 'Tranquilo' }
  if (kp < 5) return { level: 1, label: 'G1 — Menor' }
  if (kp < 6) return { level: 2, label: 'G2 — Moderado' }
  if (kp < 7) return { level: 3, label: 'G3 — Fuerte' }
  if (kp < 8) return { level: 4, label: 'G4 — Severo' }
  return { level: 5, label: 'G5 — Extremo' }
}

export async function GET(_req: NextRequest) {
  try {
    // NOAA Planetary K-index (Kp) — 3 day forecast
    const [kpRes, fluxRes] = await Promise.allSettled([
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', { next: { revalidate: 3600 } }),
      fetch('https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json', { next: { revalidate: 3600 } }),
    ])

    let kpIndex: number | null = null
    let kpMax24h: number | null = null
    const forecast: { time: string; kp: number }[] = []

    if (kpRes.status === 'fulfilled' && kpRes.value.ok) {
      const kpData = await kpRes.value.json()
      // Format: [["time_tag","kp","observed","noaa_scale"], ...]
      // Skip header row
      const rows = Array.isArray(kpData) ? kpData.slice(1) : []
      const now = new Date()
      const past = rows.filter((r: string[]) => new Date(r[0]) <= now)
      if (past.length > 0) {
        kpIndex = parseFloat(past[past.length - 1][1]) || null
      }
      const next24 = rows.filter((r: string[]) => {
        const t = new Date(r[0])
        return t > now && t <= new Date(now.getTime() + 24 * 3600_000)
      })
      if (next24.length > 0) {
        kpMax24h = Math.max(...next24.map((r: string[]) => parseFloat(r[1]) || 0))
      }
      rows.slice(0, 24).forEach((r: string[]) => {
        forecast.push({ time: r[0], kp: parseFloat(r[1]) || 0 })
      })
    }

    let solarFlux: number | null = null
    if (fluxRes.status === 'fulfilled' && fluxRes.value.ok) {
      const fluxData = await fluxRes.value.json()
      if (Array.isArray(fluxData) && fluxData.length > 0) {
        const last = fluxData[fluxData.length - 1]
        solarFlux = parseFloat(last.f10_7) || null
      }
    }

    const currentKp = kpIndex ?? 0
    const { level, label } = kpToStormLevel(currentKp)

    const result: SpaceWeatherData = {
      solarFlux,
      kpIndex,
      kpMax24h,
      auroraLatitude: kpIndex !== null ? kpToLatitude(kpIndex) : null,
      geoStormLevel: level,
      geoStormLabel: label,
      solarFlareClass: null,
      forecast,
    }

    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=3600' } })
  } catch {
    return NextResponse.json({ error: 'Space weather unavailable' }, { status: 502 })
  }
}
