import { NextRequest, NextResponse } from 'next/server'

export interface CelestialData {
  sun: {
    azimuth: number
    elevation: number
    isUp: boolean
    dawnStart: string | null
    duskEnd: string | null
  }
  moon: {
    azimuth: number
    elevation: number
    isUp: boolean
    illumination: number
    phase: number
  }
}

function toRad(deg: number) { return deg * Math.PI / 180 }
function toDeg(rad: number) { return rad * 180 / Math.PI }

function getSunPosition(date: Date, lat: number, lon: number) {
  const JD = date.getTime() / 86400000 + 2440587.5
  const n = JD - 2451545.0
  const L = (280.460 + 0.9856474 * n) % 360
  const g = toRad((357.528 + 0.9856003 * n) % 360)
  const lambda = toRad(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g))
  const epsilon = toRad(23.439 - 0.0000004 * n)
  const sinDec = Math.sin(epsilon) * Math.sin(lambda)
  const dec = Math.asin(sinDec)
  const cosDec = Math.cos(dec)
  const RA = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda))
  const GMST = (6.697375 + 0.0657098242 * n + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) * 1.00273791) % 24
  const LST = (GMST + lon / 15) % 24
  const HA = toRad((LST - toDeg(RA) / 15) * 15)
  const latRad = toRad(lat)
  const elevation = toDeg(Math.asin(Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(HA)))
  const azimuth = toDeg(Math.atan2(-Math.sin(HA), Math.tan(dec) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(HA))) + 180
  return { azimuth: (azimuth + 360) % 360, elevation }
}

function getMoonPosition(date: Date, lat: number, lon: number) {
  const JD = date.getTime() / 86400000 + 2440587.5
  const T = (JD - 2451545.0) / 36525
  const Lm = (218.316 + 13.176396 * (JD - 2451545.0)) % 360
  const M = toRad((134.963 + 13.064993 * (JD - 2451545.0)) % 360)
  const F = toRad((93.272 + 13.229350 * (JD - 2451545.0)) % 360)
  const Dm = toRad((297.850 + 12.190749 * (JD - 2451545.0)) % 360)
  const lambda_m = toRad(Lm + 6.289 * Math.sin(M) - 1.274 * Math.sin(2 * Dm - M) + 0.658 * Math.sin(2 * Dm) - 0.186 * Math.sin(toRad(357.5 + 0.985 * T)))
  const beta = toRad(5.128 * Math.sin(F))
  const epsilon = toRad(23.4393 - 0.013004 * T)
  const dec = Math.asin(Math.sin(epsilon) * Math.cos(beta) * Math.sin(lambda_m) + Math.cos(epsilon) * Math.sin(beta))
  const RA = Math.atan2(Math.cos(epsilon) * Math.cos(beta) * Math.sin(lambda_m) - Math.sin(epsilon) * Math.sin(beta), Math.cos(beta) * Math.cos(lambda_m))
  const GMST = (6.697375 + 0.0657098242 * (JD - 2451545.0) + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) * 1.00273791) % 24
  const LST = (GMST + lon / 15) % 24
  const HA = toRad((LST - toDeg(RA) / 15) * 15)
  const latRad = toRad(lat)
  const elevation = toDeg(Math.asin(Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(HA)))
  const azimuth = toDeg(Math.atan2(-Math.sin(HA), Math.tan(dec) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(HA))) + 180
  return { azimuth: (azimuth + 360) % 360, elevation }
}

function getMoonIllumination(date: Date): { illumination: number; phase: number } {
  const JD = date.getTime() / 86400000 + 2440587.5
  const daysSinceNew = (JD - 2451549.5) % 29.53058853
  const normalized = daysSinceNew < 0 ? daysSinceNew + 29.53058853 : daysSinceNew
  const phase = normalized / 29.53058853
  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2
  return { illumination: Math.round(illumination * 100), phase }
}

function getSunDawnDusk(date: Date, lat: number, lon: number): { dawn: Date | null; dusk: Date | null } {
  let dawn: Date | null = null
  let dusk: Date | null = null
  const day = new Date(date)
  day.setUTCHours(0, 0, 0, 0)
  let prevElev = getSunPosition(day, lat, lon).elevation
  for (let h = 1; h <= 24; h++) {
    const t = new Date(day.getTime() + h * 3600_000)
    const { elevation } = getSunPosition(t, lat, lon)
    if (!dawn && prevElev < -6 && elevation >= -6) dawn = t
    if (!dusk && prevElev >= -6 && elevation < -6) dusk = t
    prevElev = elevation
  }
  return { dawn, dusk }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')
  if (isNaN(lat) || isNaN(lon)) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })

  const now = new Date()
  const sun = getSunPosition(now, lat, lon)
  const moon = getMoonPosition(now, lat, lon)
  const { illumination, phase } = getMoonIllumination(now)
  const { dawn, dusk } = getSunDawnDusk(now, lat, lon)

  return NextResponse.json({
    sun: {
      azimuth: Math.round(sun.azimuth * 10) / 10,
      elevation: Math.round(sun.elevation * 10) / 10,
      isUp: sun.elevation > -0.833,
      dawnStart: dawn ? dawn.toISOString() : null,
      duskEnd: dusk ? dusk.toISOString() : null,
    },
    moon: {
      azimuth: Math.round(moon.azimuth * 10) / 10,
      elevation: Math.round(moon.elevation * 10) / 10,
      isUp: moon.elevation > -0.5,
      illumination,
      phase,
    },
  } satisfies CelestialData)
}
