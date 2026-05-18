import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface BeaufortData {
  currentScale: number
  currentDescription: string
  seaState: string
  waveHeight: string
  windSpeed: number
  windGust: number
  landEffects: string
  color: string
  hours: BeaufortHour[]
  maxScale24h: number
}

export interface BeaufortHour {
  hour: string
  scale: number
  wind: number
  gust: number
  color: string
  description: string
}

const BEAUFORT: Record<number, { desc: string; sea: string; wave: string; land: string; color: string }> = {
  0:  { desc: 'Calma',              sea: 'Mar como espejo',          wave: '0 m',         land: 'Humo sube vertical',             color: '#22c55e' },
  1:  { desc: 'Ventolina',          sea: 'Rizos sin espuma',         wave: '0–0.2 m',     land: 'Viento sensible en la piel',     color: '#84cc16' },
  2:  { desc: 'Flojito',            sea: 'Olas pequeñas',            wave: '0.2–0.5 m',   land: 'Hojas se mueven',                color: '#a3e635' },
  3:  { desc: 'Flojo',              sea: 'Crestas pequeñas',         wave: '0.5–1 m',     land: 'Hojas y ramitas en movimiento',  color: '#facc15' },
  4:  { desc: 'Bonancible',         sea: 'Olas frecuentes',          wave: '1–2 m',       land: 'Polvo y papeles vuelan',         color: '#fbbf24' },
  5:  { desc: 'Fresquito',          sea: 'Olas moderadas con cresta',wave: '2–3 m',       land: 'Arbustos se balancean',          color: '#f59e0b' },
  6:  { desc: 'Fresco',             sea: 'Olas grandes con rompiente',wave: '3–4 m',      land: 'Ramas gruesas se mueven',        color: '#f97316' },
  7:  { desc: 'Frescachón',         sea: 'Mar gruesa con espuma',    wave: '4–5.5 m',     land: 'Árboles enteros se mueven',      color: '#ea580c' },
  8:  { desc: 'Temporal',           sea: 'Mar muy gruesa',           wave: '5.5–7.5 m',   land: 'Difícil caminar',                color: '#ef4444' },
  9:  { desc: 'Temporal fuerte',    sea: 'Olas muy altas',           wave: '7–10 m',      land: 'Daños en estructuras',           color: '#dc2626' },
  10: { desc: 'Temporal muy fuerte',sea: 'Olas enormes',             wave: '9–12.5 m',    land: 'Árboles arrancados',             color: '#b91c1c' },
  11: { desc: 'Borrasca',           sea: 'Olas excepcionales',       wave: '11.5–16 m',   land: 'Daños generalizados',            color: '#991b1b' },
  12: { desc: 'Huracán',            sea: 'Mar blanca, sin visibilidad',wave: '> 16 m',    land: 'Destrucción masiva',             color: '#7f1d1d' },
}

function toBeaufort(kmh: number): number {
  const ms = kmh / 3.6
  if (ms < 0.3) return 0
  if (ms < 1.6) return 1
  if (ms < 3.4) return 2
  if (ms < 5.5) return 3
  if (ms < 8)   return 4
  if (ms < 10.8) return 5
  if (ms < 13.9) return 6
  if (ms < 17.2) return 7
  if (ms < 20.8) return 8
  if (ms < 24.5) return 9
  if (ms < 28.5) return 10
  if (ms < 32.7) return 11
  return 12
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_gusts_10m&forecast_days=2&timezone=auto`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  const raw = await res.json()

  const times: string[]  = raw.hourly?.time ?? []
  const winds: number[]  = raw.hourly?.wind_speed_10m ?? []
  const gusts: number[]  = raw.hourly?.wind_gusts_10m ?? []

  const hours: BeaufortHour[] = times.slice(0, 48).map((t, i) => {
    const wind  = winds[i] ?? 0
    const gust  = gusts[i] ?? wind
    const scale = toBeaufort(wind)
    const meta  = BEAUFORT[scale]
    return {
      hour: t.slice(11, 16),
      scale,
      wind: Math.round(wind),
      gust: Math.round(gust),
      color: meta.color,
      description: meta.desc,
    }
  })

  const h24     = hours.slice(0, 24)
  const maxScale = Math.max(...h24.map(h => h.scale))
  const current  = hours[0]
  const meta0    = BEAUFORT[current?.scale ?? 0]

  return NextResponse.json({
    currentScale: current?.scale ?? 0,
    currentDescription: meta0.desc,
    seaState: meta0.sea,
    waveHeight: meta0.wave,
    windSpeed: current?.wind ?? 0,
    windGust: current?.gust ?? 0,
    landEffects: meta0.land,
    color: meta0.color,
    hours,
    maxScale24h: maxScale,
  } satisfies BeaufortData)
}
