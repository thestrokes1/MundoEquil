import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export interface SolarPositionData {
  currentAltitude: number
  currentAzimuth: number
  shadowLength: number
  shadowLengthCategory: 'very_short' | 'short' | 'medium' | 'long' | 'very_long' | 'no_shadow'
  uvShadowRule: boolean
  solarNoonTime: string
  solarNoonAltitude: number
  solarNoonShadow: number
  daylightArc: SolarArcPoint[]
  goldenHour: { morning: string; evening: string }
  blueHour:   { morning: string; evening: string }
}

export interface SolarArcPoint {
  hour: string
  altitude: number
  azimuth: number
  shadowLength: number
}

function solarDeclination(doy: number): number {
  return 23.45 * Math.sin((360 / 365) * (doy - 81) * Math.PI / 180)
}

function equationOfTime(doy: number): number {
  const B = (360 / 365) * (doy - 81) * Math.PI / 180
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
}

function solarAltitude(lat: number, decl: number, hourAngle: number): number {
  const latR  = lat * Math.PI / 180
  const declR = decl * Math.PI / 180
  const haR   = hourAngle * Math.PI / 180
  const sinAlt = Math.sin(latR) * Math.sin(declR) + Math.cos(latR) * Math.cos(declR) * Math.cos(haR)
  return Math.asin(sinAlt) * 180 / Math.PI
}

function solarAzimuth(lat: number, decl: number, hourAngle: number, altitude: number): number {
  const latR   = lat * Math.PI / 180
  const declR  = decl * Math.PI / 180
  const altR   = altitude * Math.PI / 180
  const cosAz  = (Math.sin(declR) - Math.sin(latR) * Math.sin(altR)) / (Math.cos(latR) * Math.cos(altR))
  const az     = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI
  return hourAngle > 0 ? 360 - az : az
}

function shadowLength(altitudeDeg: number): number {
  if (altitudeDeg <= 0) return -1
  return Math.round(1 / Math.tan(altitudeDeg * Math.PI / 180) * 10) / 10
}

function shadowCategory(len: number): SolarPositionData['shadowLengthCategory'] {
  if (len < 0)   return 'no_shadow'
  if (len < 0.5) return 'very_short'
  if (len < 1.5) return 'short'
  if (len < 3)   return 'medium'
  if (len < 8)   return 'long'
  return 'very_long'
}

function dayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  const doy    = dayOfYear()
  const decl   = solarDeclination(doy)
  const eot    = equationOfTime(doy)

  const now = new Date()
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60
  const solarTime = utcH + lonNum / 15 + eot / 60
  const hourAngle = (solarTime - 12) * 15

  const currentAlt = solarAltitude(latNum, decl, hourAngle)
  const currentAz  = solarAzimuth(latNum, decl, hourAngle, currentAlt)
  const currentSL  = shadowLength(currentAlt)

  // Solar noon
  const solarNoonHourAngle = 0
  const noonAlt = solarAltitude(latNum, decl, solarNoonHourAngle)
  const noonSL  = shadowLength(noonAlt)
  const noonUtcH = 12 - lonNum / 15 - eot / 60
  const noonHH  = Math.floor(((noonUtcH % 24) + 24) % 24)
  const noonMM  = Math.round((((noonUtcH % 24) + 24) % 24 - noonHH) * 60)
  const solarNoonTime = `${String(noonHH).padStart(2,'0')}:${String(noonMM).padStart(2,'0')}`

  // Daily arc
  const arc: SolarArcPoint[] = []
  for (let h = 5; h <= 21; h++) {
    const st  = h + lonNum / 15 + eot / 60
    const ha  = (st - 12) * 15
    const alt = solarAltitude(latNum, decl, ha)
    const az  = solarAzimuth(latNum, decl, ha, alt)
    const sl  = shadowLength(alt)
    arc.push({
      hour: `${String(h).padStart(2,'0')}:00`,
      altitude: Math.round(alt * 10) / 10,
      azimuth: Math.round(az * 10) / 10,
      shadowLength: sl,
    })
  }

  // Golden & blue hour (rough)
  const riseHA  = Math.acos(-Math.tan(latNum * Math.PI / 180) * Math.tan(decl * Math.PI / 180)) * 180 / Math.PI
  const riseH   = 12 - riseHA / 15 - lonNum / 15 - eot / 60
  const setH    = 12 + riseHA / 15 - lonNum / 15 - eot / 60
  const fmt = (h: number) => {
    const hh = Math.floor(((h % 24) + 24) % 24)
    const mm = Math.round((((h % 24) + 24) % 24 - hh) * 60)
    return `${String(hh).padStart(2,'0')}:${String(Math.min(mm,59)).padStart(2,'0')}`
  }

  return NextResponse.json({
    currentAltitude: Math.round(currentAlt * 10) / 10,
    currentAzimuth:  Math.round(currentAz * 10) / 10,
    shadowLength: currentSL,
    shadowLengthCategory: shadowCategory(currentSL),
    uvShadowRule: currentAlt >= 45,
    solarNoonTime,
    solarNoonAltitude: Math.round(noonAlt * 10) / 10,
    solarNoonShadow: Math.round(noonSL * 10) / 10,
    daylightArc: arc,
    goldenHour: {
      morning: fmt(riseH),
      evening: fmt(setH - 1),
    },
    blueHour: {
      morning: fmt(riseH - 0.5),
      evening: fmt(setH + 0.5),
    },
  } satisfies SolarPositionData)
}
